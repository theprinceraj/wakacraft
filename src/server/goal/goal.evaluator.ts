import { GoalStatuses, Weekdays, type GoalStatus } from '@/lib/util/Goals';
import { addDays, humanizeSeconds, weekdayOf } from '@/lib/util/Time';

import type { IGoalZodSchema } from '@/lib/mongo/zod';

export type GoalRules = Pick<
	IGoalZodSchema,
	| 'delta'
	| 'seconds'
	| 'isInverse'
	| 'ignoreDays'
	| 'ignoreZeroDays'
	| 'projects'
	| 'languages'
	| 'editors'
	| 'categories'
>;

export interface GoalPeriod {
	/** Inclusive local dates. A daily goal's period is one day; a weekly goal's is the user's week. */
	start: string;
	end: string;
	actualSeconds: number;
	status: GoalStatus;
	reason: string;
}

/** Periods to chart, oldest first: the last 14 days, or the last 8 weeks starting on `weekStartDay`. */
export function goalPeriods(delta: IGoalZodSchema['delta'], today: string, weekStartDay: number) {
	if (delta === 'day')
		return Array.from({ length: 14 }, (_, index) => ({
			start: addDays(today, index - 13),
			end: addDays(today, index - 13),
		}));

	const thisWeek = addDays(today, -((weekdayOf(today) - weekStartDay + 7) % 7));
	return Array.from({ length: 8 }, (_, index) => {
		const start = addDays(thisWeek, (index - 7) * 7);
		return { start, end: addDays(start, 6) };
	});
}

/**
 * Status of one period. The current period stays `pending` until it is decided: met for an "at least" goal, or
 * exceeded for an "at most" goal (which can still fail later, but never un-fail).
 */
export function periodStatus(
	rules: GoalRules,
	period: { start: string; end: string },
	actualSeconds: number,
	today: string,
): { status: GoalStatus; reason: string } {
	if (rules.delta === 'day' && rules.ignoreDays.includes(Weekdays[weekdayOf(period.start)])) {
		return { status: GoalStatuses.Ignored, reason: `${Weekdays[weekdayOf(period.start)]}s are ignored` };
	}
	if (period.start > today) return { status: GoalStatuses.Pending, reason: 'Upcoming' };

	const isCurrent = period.start <= today && today <= period.end;
	const met = rules.isInverse ? actualSeconds <= rules.seconds : actualSeconds >= rules.seconds;

	if (isCurrent) {
		if (rules.isInverse) {
			return met
				? { status: GoalStatuses.Pending, reason: 'Under the limit so far' }
				: { status: GoalStatuses.Fail, reason: `Over the limit by ${humanizeSeconds(actualSeconds - rules.seconds)}` };
		}
		return met
			? { status: GoalStatuses.Success, reason: 'Goal reached' }
			: { status: GoalStatuses.Pending, reason: `${humanizeSeconds(rules.seconds - actualSeconds)} to go` };
	}

	if (rules.ignoreZeroDays && actualSeconds === 0)
		return { status: GoalStatuses.Ignored, reason: 'No activity (holiday)' };
	if (met) return { status: GoalStatuses.Success, reason: rules.isInverse ? 'Stayed under the limit' : 'Goal reached' };
	return {
		status: GoalStatuses.Fail,
		reason: rules.isInverse
			? `Over the limit by ${humanizeSeconds(actualSeconds - rules.seconds)}`
			: `Short by ${humanizeSeconds(rules.seconds - actualSeconds)}`,
	};
}

/** Consecutive successes counting back from the most recent decided period; ignored periods don't break it. */
export function goalStreak(periods: readonly GoalPeriod[]): number {
	let streak = 0;
	for (let index = periods.length - 1; index >= 0; index--) {
		const { status } = periods[index];
		if (status === GoalStatuses.Pending || status === GoalStatuses.Ignored) continue;
		if (status !== GoalStatuses.Success) break;
		streak++;
	}
	return streak;
}

const list = (values: string[]) =>
	values.length <= 2 ? values.join(' and ') : `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;

/** "Code at least 2 hrs per day in TypeScript on wakacraft" — WakaTime-style generated title. */
export function goalTitle(rules: GoalRules): string {
	const parts = [
		`Code ${rules.isInverse ? 'at most' : 'at least'} ${humanizeSeconds(rules.seconds)} per ${rules.delta}`,
	];
	if (rules.languages.length) parts.push(`in ${list(rules.languages)}`);
	if (rules.projects.length) parts.push(`on ${list(rules.projects)}`);
	if (rules.editors.length) parts.push(`with ${list(rules.editors)}`);
	if (rules.categories.length) parts.push(`(${list(rules.categories)})`);
	return parts.join(' ');
}
