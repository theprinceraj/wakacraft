import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import {
	eachDate,
	humanizeSeconds,
	localDateOf,
	localDayBounds,
	round,
	toHumanDuration,
	todayIn,
} from '@/lib/util/Time';
import { userProfileService } from '@/server/user/user-profile.service';

import { emptyTotals, heartbeatFilter, loadDayTotals, type StatsSettings } from './day-totals';
import { computeDurations, mergeStatTotals, type DayTotals, type EngineHeartbeat } from './engine';
import { resolveStatsRange, resolveSummaryRange } from './ranges';
import {
	dailyAverage,
	dateText,
	secondsExcludingOther,
	toDaySummary,
	toStatItems,
	type AllTimeResponse,
	type DurationsResponse,
	type StatsResponse,
	type StatusBarResponse,
	type SummariesResponse,
} from './stats.response.dto';

import type { DurationsQuery, StatsSettingsQuery, SummariesQuery } from './stats.request.dto';

const isoAt = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

class StatsService {
	/** The user's settings, with any per-request overrides from the query string. */
	public async resolveSettings(
		userId: string,
		overrides: StatsSettingsQuery = {},
	): Promise<StatsSettings & { weekStartDay: number; username: string | null }> {
		const profile = await userProfileService.getProfile(userId);
		return {
			timezone: overrides.timezone ?? profile.timezone,
			timeoutMinutes: overrides.timeout ?? profile.timeout,
			writesOnly: overrides.writes_only ?? profile.writesOnly,
			weekStartDay: profile.weekStartDay,
			username: profile.username ?? null,
		};
	}

	public async getSummaries(userId: string, query: SummariesQuery): Promise<SummariesResponse> {
		const settings = await this.resolveSettings(userId, query);
		const today = todayIn(settings.timezone);
		const range = query.range
			? resolveSummaryRange(query.range, today, settings.weekStartDay)
			: { start: query.start!, end: query.end!, text: '' };

		const dates = eachDate(range.start, range.end);
		const filter = { project: query.project, branches: query.branches };
		const totals = await loadDayTotals(userId, dates, settings, filter);
		const days = dates.map((date) => totals.get(date)!);

		const cumulative = days.reduce((sum, day) => sum + day.totalSeconds, 0);
		const human = toHumanDuration(cumulative);

		return {
			data: dates.map((date, index) =>
				toDaySummary(date, days[index], settings.timezone, {
					includeBranchesAndEntities: Boolean(query.project),
					rangeText: date === today ? 'Today' : undefined,
				}),
			),
			start: isoAt(localDayBounds(range.start, settings.timezone).start),
			end: isoAt(localDayBounds(range.end, settings.timezone).end - 1),
			cumulative_total: {
				seconds: round(cumulative),
				text: human.text,
				decimal: human.decimal,
				digital: human.digital,
			},
			daily_average: dailyAverage(days),
		};
	}

	public async getStatusBarToday(userId: string): Promise<StatusBarResponse> {
		const settings = await this.resolveSettings(userId);
		const today = todayIn(settings.timezone);
		const totals = await loadDayTotals(userId, [today], settings);

		return {
			cached_at: new Date().toISOString(),
			has_team_features: false,
			data: toDaySummary(today, totals.get(today)!, settings.timezone, { rangeText: 'Today' }),
		};
	}

	public async getDurations(userId: string, query: DurationsQuery): Promise<DurationsResponse> {
		const settings = await this.resolveSettings(userId, query);
		const { start, end } = localDayBounds(query.date, settings.timezone);
		const extraFilter = heartbeatFilter(settings, { project: query.project, branches: query.branches });

		const [heartbeats, after, projects] = await Promise.all([
			mongoHeartbeatService.findInRange(userId, start, end, extraFilter) as Promise<EngineHeartbeat[]>,
			mongoHeartbeatService.findFirstAtOrAfter(userId, end, extraFilter),
			mongoProjectService.find({ userId, color: { $type: 'string' } }, ['name', 'color']),
		]);
		const colors = new Map(projects.map((project) => [project.name, project.color ?? null]));

		const durations = computeDurations(heartbeats, query.slice_by, {
			timeoutSeconds: settings.timeoutMinutes * 60,
			rangeEnd: end,
			nextAfterRange: after,
		});

		return {
			data: durations.map((duration) => ({
				time: duration.start,
				duration: round(duration.duration, 6),
				project: duration.project,
				color: colors.get(duration.project) ?? null,
				ai_line_changes: duration.aiLineChanges,
				human_line_changes: duration.humanLineChanges,
				...(query.slice_by === 'project' ? {} : { [query.slice_by]: duration.key }),
			})),
			start: isoAt(start),
			end: isoAt(end - 1),
			timezone: settings.timezone,
		};
	}

	public async getStats(userId: string, range: string, overrides: StatsSettingsQuery): Promise<StatsResponse> {
		const settings = await this.resolveSettings(userId, overrides);
		const today = todayIn(settings.timezone);
		const first = await mongoHeartbeatService.findFirst(userId);
		const firstDate = first ? localDateOf(first.time, settings.timezone) : null;
		const resolved = resolveStatsRange(range, today, firstDate);

		// Days before the first heartbeat can't have data, so they aren't loaded — but they still count as days
		// (holidays) in the range, as on WakaTime.
		const dates = eachDate(resolved.start, resolved.end);
		const loadable = dates.filter((date) => !firstDate || date >= firstDate);
		const totals = firstDate ? await loadDayTotals(userId, loadable, settings) : new Map<string, DayTotals>();
		const days = dates.map((date) => totals.get(date) ?? emptyTotals());

		const total = sumTotals(days);
		const average = dailyAverage(days);
		const best = days.reduce<{ date: string; seconds: number } | null>(
			(winner, day, index) =>
				day.totalSeconds > (winner?.seconds ?? 0) ? { date: dates[index], seconds: day.totalSeconds } : winner,
			null,
		);
		const totalExcludingOther = secondsExcludingOther(total);
		const now = new Date().toISOString();

		return {
			data: {
				id: `${userId}:${range}`,
				user_id: userId,
				username: settings.username,
				range,
				human_readable_range: resolved.text,
				start: isoAt(localDayBounds(resolved.start, settings.timezone).start),
				end: isoAt(localDayBounds(resolved.end, settings.timezone).end - 1),
				timezone: settings.timezone,
				timeout: settings.timeoutMinutes,
				writes_only: settings.writesOnly,
				status: 'ok',
				percent_calculated: 100,
				is_up_to_date: true,
				is_already_updating: false,
				is_stuck: false,
				is_including_today: resolved.end === today,
				is_coding_activity_visible: true,
				is_language_usage_visible: true,
				is_editor_usage_visible: true,
				is_category_usage_visible: true,
				is_os_usage_visible: true,
				total_seconds: round(totalExcludingOther),
				total_seconds_including_other_language: round(total.totalSeconds),
				human_readable_total: humanizeSeconds(totalExcludingOther),
				human_readable_total_including_other_language: humanizeSeconds(total.totalSeconds),
				daily_average: average.seconds,
				daily_average_including_other_language: average.seconds_including_other_language,
				human_readable_daily_average: average.text,
				human_readable_daily_average_including_other_language: average.text_including_other_language,
				holidays: average.holidays,
				days_including_holidays: average.days_including_holidays,
				days_minus_holidays: average.days_minus_holidays,
				best_day: best
					? { date: best.date, text: humanizeSeconds(best.seconds), total_seconds: round(best.seconds) }
					: null,
				ai_line_changes: total.aiLineChanges,
				human_line_changes: total.humanLineChanges,
				ai_input_tokens: total.aiInputTokens,
				ai_cached_input_tokens: total.aiCachedInputTokens,
				ai_output_tokens: total.aiOutputTokens,
				ai_sessions: total.aiSessions,
				projects: toStatItems(total.projects, total.totalSeconds),
				languages: toStatItems(total.languages, total.totalSeconds),
				editors: toStatItems(total.editors, total.totalSeconds),
				operating_systems: toStatItems(total.operatingSystems, total.totalSeconds),
				categories: toStatItems(total.categories, total.totalSeconds),
				machines: toStatItems(total.machines, total.totalSeconds),
				dependencies: toStatItems(total.dependencies, total.totalSeconds),
				created_at: now,
				modified_at: now,
			},
		};
	}

	public async getAllTimeSinceToday(userId: string, project?: string): Promise<AllTimeResponse> {
		const settings = await this.resolveSettings(userId);
		const today = todayIn(settings.timezone);
		const first = await mongoHeartbeatService.findFirst(userId);
		const start = first ? localDateOf(first.time, settings.timezone) : today;
		const dates = eachDate(start, today);
		const totals = await loadDayTotals(userId, dates, settings, { project });
		const days = dates.map((date) => totals.get(date)!);
		const total = days.reduce((sum, day) => sum + day.totalSeconds, 0);
		const human = toHumanDuration(total);
		const active = days.filter((day) => day.totalSeconds > 0).length;

		return {
			data: {
				total_seconds: human.total_seconds,
				text: human.text,
				decimal: human.decimal,
				digital: human.digital,
				daily_average: active ? round(total / active) : 0,
				is_up_to_date: true,
				percent_calculated: 100,
				range: {
					start: isoAt(localDayBounds(start, settings.timezone).start),
					start_date: start,
					start_text: dateText(start),
					end: isoAt(localDayBounds(today, settings.timezone).end - 1),
					end_date: today,
					end_text: 'Today',
					timezone: settings.timezone,
				},
				timeout: settings.timeoutMinutes,
			},
		};
	}
}

/** Adds day totals together into one range total. */
export function sumTotals(days: readonly DayTotals[]): DayTotals {
	return {
		totalSeconds: days.reduce((sum, day) => sum + day.totalSeconds, 0),
		aiLineChanges: days.reduce((sum, day) => sum + day.aiLineChanges, 0),
		humanLineChanges: days.reduce((sum, day) => sum + day.humanLineChanges, 0),
		aiInputTokens: days.reduce((sum, day) => sum + day.aiInputTokens, 0),
		aiCachedInputTokens: days.reduce((sum, day) => sum + day.aiCachedInputTokens, 0),
		aiOutputTokens: days.reduce((sum, day) => sum + day.aiOutputTokens, 0),
		// Sessions are counted per day; a session spanning midnight counts on both days.
		aiSessions: days.reduce((sum, day) => sum + day.aiSessions, 0),
		projects: mergeStatTotals(days.map((day) => day.projects)),
		languages: mergeStatTotals(days.map((day) => day.languages)),
		editors: mergeStatTotals(days.map((day) => day.editors)),
		operatingSystems: mergeStatTotals(days.map((day) => day.operatingSystems)),
		categories: mergeStatTotals(days.map((day) => day.categories)),
		machines: mergeStatTotals(days.map((day) => day.machines)),
		dependencies: mergeStatTotals(days.map((day) => day.dependencies)),
		branches: mergeStatTotals(days.map((day) => day.branches)),
		entities: mergeStatTotals(days.map((day) => day.entities)),
	};
}

export const statsService = new StatsService();
