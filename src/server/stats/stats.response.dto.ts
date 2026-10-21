import { z } from 'zod';

import { UNKNOWN_LANGUAGE } from '@/lib/util/Heartbeats';
import { humanizeSeconds, localDayBounds, round, toHumanDuration } from '@/lib/util/Time';

import type { DayTotals, StatTotal } from './engine';

/**
 * Output contracts for the stats endpoints, in WakaTime's snake_case shape so WakaTime API clients (status-bar
 * widgets, README stat cards) work against wakacraft unchanged. Builders below produce these types.
 */

const HumanDurationSchema = z.object({
	total_seconds: z.number(),
	digital: z.string(),
	decimal: z.string(),
	text: z.string(),
	hours: z.number(),
	minutes: z.number(),
	seconds: z.number(),
});

export const StatItemSchema = HumanDurationSchema.extend({
	name: z.string(),
	percent: z.number(),
	ai_line_changes: z.number(),
	human_line_changes: z.number(),
});
export type StatItem = z.infer<typeof StatItemSchema>;

export const GrandTotalSchema = HumanDurationSchema.extend({
	ai_line_changes: z.number(),
	human_line_changes: z.number(),
	ai_input_tokens: z.number(),
	ai_cached_input_tokens: z.number(),
	ai_output_tokens: z.number(),
	ai_sessions: z.number(),
});

export const DayRangeSchema = z.object({
	date: z.iso.date(),
	start: z.iso.datetime(),
	end: z.iso.datetime(),
	text: z.string(),
	timezone: z.string(),
});

export const DaySummarySchema = z.object({
	grand_total: GrandTotalSchema,
	projects: z.array(StatItemSchema),
	languages: z.array(StatItemSchema),
	editors: z.array(StatItemSchema),
	operating_systems: z.array(StatItemSchema),
	categories: z.array(StatItemSchema),
	machines: z.array(StatItemSchema),
	dependencies: z.array(StatItemSchema),
	branches: z.array(StatItemSchema).optional(),
	entities: z.array(StatItemSchema).optional(),
	range: DayRangeSchema,
});
export type DaySummary = z.infer<typeof DaySummarySchema>;

export const SummariesResponseSchema = z.object({
	data: z.array(DaySummarySchema),
	start: z.iso.datetime(),
	end: z.iso.datetime(),
	cumulative_total: z.object({ seconds: z.number(), text: z.string(), decimal: z.string(), digital: z.string() }),
	daily_average: z.object({
		holidays: z.number(),
		days_including_holidays: z.number(),
		days_minus_holidays: z.number(),
		seconds: z.number(),
		text: z.string(),
		seconds_including_other_language: z.number(),
		text_including_other_language: z.string(),
	}),
});
export type SummariesResponse = z.infer<typeof SummariesResponseSchema>;

/** With `slice_by` other than `project`, each item also carries that dimension's value under its own key. */
export const DurationItemSchema = z.object({
	time: z.number(),
	duration: z.number(),
	project: z.string(),
	color: z.string().nullable(),
	ai_line_changes: z.number(),
	human_line_changes: z.number(),
	entity: z.string().optional(),
	language: z.string().optional(),
	dependencies: z.string().optional(),
	os: z.string().optional(),
	editor: z.string().optional(),
	category: z.string().optional(),
	machine: z.string().optional(),
});

export const DurationsResponseSchema = z.object({
	data: z.array(DurationItemSchema),
	start: z.iso.datetime(),
	end: z.iso.datetime(),
	timezone: z.string(),
});
export type DurationsResponse = z.infer<typeof DurationsResponseSchema>;

export const StatusBarResponseSchema = z.object({
	cached_at: z.iso.datetime(),
	has_team_features: z.boolean(),
	data: DaySummarySchema,
});
export type StatusBarResponse = z.infer<typeof StatusBarResponseSchema>;

export const StatsResponseSchema = z.object({
	data: z.object({
		id: z.string(),
		user_id: z.string(),
		username: z.string().nullable(),
		range: z.string(),
		human_readable_range: z.string(),
		start: z.iso.datetime(),
		end: z.iso.datetime(),
		timezone: z.string(),
		timeout: z.number(),
		writes_only: z.boolean(),
		status: z.literal('ok'),
		percent_calculated: z.number(),
		is_up_to_date: z.boolean(),
		is_already_updating: z.boolean(),
		is_stuck: z.boolean(),
		is_including_today: z.boolean(),
		is_coding_activity_visible: z.boolean(),
		is_language_usage_visible: z.boolean(),
		is_editor_usage_visible: z.boolean(),
		is_category_usage_visible: z.boolean(),
		is_os_usage_visible: z.boolean(),
		total_seconds: z.number(),
		total_seconds_including_other_language: z.number(),
		human_readable_total: z.string(),
		human_readable_total_including_other_language: z.string(),
		daily_average: z.number(),
		daily_average_including_other_language: z.number(),
		human_readable_daily_average: z.string(),
		human_readable_daily_average_including_other_language: z.string(),
		holidays: z.number(),
		days_including_holidays: z.number(),
		days_minus_holidays: z.number(),
		best_day: z.object({ date: z.iso.date(), text: z.string(), total_seconds: z.number() }).nullable(),
		ai_line_changes: z.number(),
		human_line_changes: z.number(),
		ai_input_tokens: z.number(),
		ai_cached_input_tokens: z.number(),
		ai_output_tokens: z.number(),
		ai_sessions: z.number(),
		projects: z.array(StatItemSchema),
		languages: z.array(StatItemSchema),
		editors: z.array(StatItemSchema),
		operating_systems: z.array(StatItemSchema),
		categories: z.array(StatItemSchema),
		machines: z.array(StatItemSchema),
		dependencies: z.array(StatItemSchema),
		created_at: z.iso.datetime(),
		modified_at: z.iso.datetime(),
	}),
});
export type StatsResponse = z.infer<typeof StatsResponseSchema>;

export const AllTimeResponseSchema = z.object({
	data: z.object({
		total_seconds: z.number(),
		text: z.string(),
		decimal: z.string(),
		digital: z.string(),
		daily_average: z.number(),
		is_up_to_date: z.boolean(),
		percent_calculated: z.number(),
		range: z.object({
			start: z.iso.datetime(),
			start_date: z.iso.date(),
			start_text: z.string(),
			end: z.iso.datetime(),
			end_date: z.iso.date(),
			end_text: z.string(),
			timezone: z.string(),
		}),
		timeout: z.number(),
	}),
});
export type AllTimeResponse = z.infer<typeof AllTimeResponseSchema>;

// ---------------------------------------------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------------------------------------------

export function toStatItems(items: readonly StatTotal[], totalSeconds: number): StatItem[] {
	return items.map((item) => ({
		name: item.name,
		...toHumanDuration(item.totalSeconds),
		percent: totalSeconds > 0 ? round((item.totalSeconds / totalSeconds) * 100) : 0,
		ai_line_changes: item.aiLineChanges,
		human_line_changes: item.humanLineChanges,
	}));
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ordinal = (day: number) => {
	if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
	return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;
};

/** "Wed Oct 21st 2026", WakaTime's date label. */
export function dateText(date: string): string {
	const [year, month, day] = date.split('-').map(Number);
	const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return `${DAYS[weekday]} ${MONTHS[month - 1]} ${ordinal(day)} ${year}`;
}

const isoAt = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

export function toDaySummary(
	date: string,
	totals: DayTotals,
	timezone: string,
	options: { includeBranchesAndEntities?: boolean; rangeText?: string } = {},
): DaySummary {
	const { start, end } = localDayBounds(date, timezone);
	const total = totals.totalSeconds;

	return {
		grand_total: {
			...toHumanDuration(total),
			ai_line_changes: totals.aiLineChanges,
			human_line_changes: totals.humanLineChanges,
			ai_input_tokens: totals.aiInputTokens,
			ai_cached_input_tokens: totals.aiCachedInputTokens,
			ai_output_tokens: totals.aiOutputTokens,
			ai_sessions: totals.aiSessions,
		},
		projects: toStatItems(totals.projects, total),
		languages: toStatItems(totals.languages, total),
		editors: toStatItems(totals.editors, total),
		operating_systems: toStatItems(totals.operatingSystems, total),
		categories: toStatItems(totals.categories, total),
		machines: toStatItems(totals.machines, total),
		dependencies: toStatItems(totals.dependencies, total),
		...(options.includeBranchesAndEntities
			? { branches: toStatItems(totals.branches, total), entities: toStatItems(totals.entities, total) }
			: {}),
		range: { date, start: isoAt(start), end: isoAt(end - 1), text: options.rangeText ?? dateText(date), timezone },
	};
}

/** Seconds excluding the "Other" language bucket, which WakaTime leaves out of headline averages. */
export const secondsExcludingOther = (totals: Pick<DayTotals, 'totalSeconds' | 'languages'>) =>
	totals.totalSeconds - (totals.languages.find((language) => language.name === UNKNOWN_LANGUAGE)?.totalSeconds ?? 0);

export function dailyAverage(days: readonly DayTotals[]) {
	const active = days.filter((day) => day.totalSeconds > 0);
	const total = days.reduce((sum, day) => sum + day.totalSeconds, 0);
	const totalExcludingOther = days.reduce((sum, day) => sum + secondsExcludingOther(day), 0);
	const seconds = active.length ? totalExcludingOther / active.length : 0;
	const secondsIncludingOther = active.length ? total / active.length : 0;

	return {
		holidays: days.length - active.length,
		days_including_holidays: days.length,
		days_minus_holidays: active.length,
		seconds: round(seconds),
		text: humanizeSeconds(seconds),
		seconds_including_other_language: round(secondsIncludingOther),
		text_including_other_language: humanizeSeconds(secondsIncludingOther),
	};
}
