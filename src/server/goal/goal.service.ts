import { BadRequestException, NotFoundException } from '@/lib/http/errors';
import { mongoGoalService } from '@/lib/mongo/goal/goal.service';
import { GoalStatuses } from '@/lib/util/Goals';
import { eachDate, humanizeSeconds, round, todayIn } from '@/lib/util/Time';
import { loadDayTotals } from '@/server/stats/day-totals';
import { dateText } from '@/server/stats/stats.response.dto';
import { statsService } from '@/server/stats/stats.service';

import { goalPeriods, goalStreak, goalTitle, periodStatus, type GoalPeriod } from './goal.evaluator';

import type { CreateGoalInput, UpdateGoalInput } from './goal.request.dto';
import type { GoalResponse } from './goal.response.dto';
import type { IGoalZodSchema } from '@/lib/mongo/zod';

const MAX_GOALS = 30;

class GoalService {
	public async list(userId: string): Promise<GoalResponse[]> {
		const goals = await mongoGoalService.find({ userId }, '', { sort: { createdAt: 1 } });
		return Promise.all(goals.map((goal) => this.evaluate(userId, goal)));
	}

	public async get(userId: string, id: string): Promise<GoalResponse> {
		return this.evaluate(userId, await this.find(userId, id));
	}

	public async create(userId: string, input: CreateGoalInput): Promise<GoalResponse> {
		if ((await mongoGoalService.count({ userId })) >= MAX_GOALS) {
			throw new BadRequestException(`You can have at most ${MAX_GOALS} goals`);
		}
		const goal = await mongoGoalService.create({ ...input, userId, title: input.title || undefined });
		return this.evaluate(userId, goal);
	}

	public async update(userId: string, id: string, input: UpdateGoalInput): Promise<GoalResponse> {
		const current = await this.find(userId, id);
		const merged = { ...current, ...input };
		if (merged.delta === 'day' && merged.seconds > 86_400) {
			throw new BadRequestException('A daily goal fits in 24 hours', { seconds: ['A daily goal fits in 24 hours'] });
		}

		// Nullable fields: a value sets, `null` (or an empty title) clears, `undefined` leaves alone.
		const { title, snoozeUntil, ...rest } = input;
		const $set: Record<string, unknown> = { ...rest };
		const $unset: Record<string, 1> = {};
		if (title !== undefined) {
			if (title) $set.title = title;
			else $unset.title = 1;
		}
		if (snoozeUntil !== undefined) {
			if (snoozeUntil) $set.snoozeUntil = snoozeUntil;
			else $unset.snoozeUntil = 1;
		}

		const goal = await mongoGoalService.updateOne(
			{ userId, id },
			{ $set, ...(Object.keys($unset).length ? { $unset } : {}) },
		);
		if (!goal) throw new NotFoundException('Goal not found');
		return this.evaluate(userId, goal);
	}

	public async remove(userId: string, id: string): Promise<void> {
		if (!(await mongoGoalService.deleteOne({ userId, id }, 'id'))) throw new NotFoundException('Goal not found');
	}

	private async find(userId: string, id: string): Promise<IGoalZodSchema> {
		const goal = await mongoGoalService.findOne({ userId, id });
		if (!goal) throw new NotFoundException('Goal not found');
		return goal;
	}

	private async evaluate(userId: string, goal: IGoalZodSchema): Promise<GoalResponse> {
		const settings = await statsService.resolveSettings(userId);
		const today = todayIn(settings.timezone);
		const ranges = goalPeriods(goal.delta, today, settings.weekStartDay);
		const dates = eachDate(ranges[0].start, ranges.at(-1)!.end).filter((date) => date <= today);

		const totals = await loadDayTotals(userId, dates, settings, {
			projects: goal.projects,
			languages: goal.languages,
			editors: goal.editors,
			categories: goal.categories,
		});

		const periods: GoalPeriod[] = ranges.map((range) => {
			const actualSeconds = eachDate(range.start, range.end).reduce(
				(sum, date) => sum + (totals.get(date)?.totalSeconds ?? 0),
				0,
			);
			return { ...range, actualSeconds, ...periodStatus(goal, range, actualSeconds, today) };
		});

		const current = periods.at(-1)!;
		const isSnoozed = Boolean(goal.snoozeUntil && goal.snoozeUntil.getTime() > Date.now());

		return {
			id: goal.id,
			title: goal.title || goalTitle(goal),
			custom_title: goal.title ?? null,
			delta: goal.delta,
			seconds: goal.seconds,
			type: 'coding',
			status: !goal.isEnabled || isSnoozed ? GoalStatuses.Ignored : current.status,
			status_percent_calculated: 100,
			streak: goalStreak(periods),
			is_inverse: goal.isInverse,
			is_enabled: goal.isEnabled,
			is_snoozed: isSnoozed,
			snooze_until: goal.snoozeUntil?.toISOString() ?? null,
			ignore_days: goal.ignoreDays,
			ignore_zero_days: goal.ignoreZeroDays,
			projects: goal.projects,
			languages: goal.languages,
			editors: goal.editors,
			categories: goal.categories,
			chart_data: periods.map((period) => ({
				range: {
					start: period.start,
					end: period.end,
					text:
						period.start === period.end
							? dateText(period.start)
							: `${dateText(period.start)} – ${dateText(period.end)}`,
				},
				actual_seconds: round(period.actualSeconds),
				actual_seconds_text: humanizeSeconds(period.actualSeconds),
				goal_seconds: goal.seconds,
				goal_seconds_text: humanizeSeconds(goal.seconds),
				range_status: period.status,
				range_status_reason: period.reason,
			})),
			created_at: goal.createdAt.toISOString(),
			modified_at: goal.updatedAt.toISOString(),
		};
	}
}

export const goalService = new GoalService();
