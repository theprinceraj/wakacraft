import { addDays, weekdayOf } from '@/lib/util/Time';

export interface DateRange {
	start: string;
	end: string;
	text: string;
}

/** The named `range` values `GET summaries` accepts, as WakaTime spells them. */
export const SummaryRangeNames = [
	'Today',
	'Yesterday',
	'Last 7 Days',
	'Last 7 Days from Yesterday',
	'Last 14 Days',
	'Last 30 Days',
	'This Week',
	'Last Week',
	'This Month',
	'Last Month',
] as const;
export type SummaryRangeName = (typeof SummaryRangeNames)[number];

const startOfWeek = (date: string, weekStartDay: number) => addDays(date, -((weekdayOf(date) - weekStartDay + 7) % 7));
const startOfMonth = (date: string) => `${date.slice(0, 7)}-01`;
const endOfMonth = (date: string) => addDays(startOfMonth(addDays(startOfMonth(date), 32)), -1);

export function resolveSummaryRange(name: SummaryRangeName, today: string, weekStartDay: number): DateRange {
	switch (name) {
		case 'Today':
			return { start: today, end: today, text: name };
		case 'Yesterday':
			return { start: addDays(today, -1), end: addDays(today, -1), text: name };
		case 'Last 7 Days':
			return { start: addDays(today, -6), end: today, text: name };
		case 'Last 7 Days from Yesterday':
			return { start: addDays(today, -7), end: addDays(today, -1), text: name };
		case 'Last 14 Days':
			return { start: addDays(today, -13), end: today, text: name };
		case 'Last 30 Days':
			return { start: addDays(today, -29), end: today, text: name };
		case 'This Week':
			return { start: startOfWeek(today, weekStartDay), end: today, text: name };
		case 'Last Week': {
			const start = addDays(startOfWeek(today, weekStartDay), -7);
			return { start, end: addDays(start, 6), text: name };
		}
		case 'This Month':
			return { start: startOfMonth(today), end: today, text: name };
		case 'Last Month': {
			const start = startOfMonth(addDays(startOfMonth(today), -1));
			return { start, end: endOfMonth(start), text: name };
		}
	}
}

/** `:range` values for `GET stats/:range` and insights. */
export const StatsRangePattern =
	/^(last_7_days|last_30_days|last_6_months|last_year|all_time|\d{4}|\d{4}-(0[1-9]|1[0-2]))$/;

const STATS_RANGE_TEXT: Record<string, string> = {
	last_7_days: 'Last 7 Days',
	last_30_days: 'Last 30 Days',
	last_6_months: 'Last 6 Months',
	last_year: 'Last Year',
	all_time: 'All Time',
};

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

/**
 * Resolves a stats range to calendar dates. Relative ranges end today; `all_time` starts at the user's first
 * heartbeat; calendar years/months are clipped to today.
 */
export function resolveStatsRange(range: string, today: string, firstActivityDate: string | null): DateRange {
	switch (range) {
		case 'last_7_days':
			return { start: addDays(today, -6), end: today, text: STATS_RANGE_TEXT[range] };
		case 'last_30_days':
			return { start: addDays(today, -29), end: today, text: STATS_RANGE_TEXT[range] };
		case 'last_6_months':
			return { start: addDays(today, -182), end: today, text: STATS_RANGE_TEXT[range] };
		case 'last_year':
			return { start: addDays(today, -364), end: today, text: STATS_RANGE_TEXT[range] };
		case 'all_time':
			return { start: firstActivityDate ?? today, end: today, text: STATS_RANGE_TEXT[range] };
	}

	if (/^\d{4}$/.test(range)) {
		const end = `${range}-12-31` < today ? `${range}-12-31` : today;
		return { start: `${range}-01-01`, end, text: range };
	}

	const start = `${range}-01`;
	const monthEnd = endOfMonth(start);
	return {
		start,
		end: monthEnd < today ? monthEnd : today,
		text: `${MONTHS[Number(range.slice(5, 7)) - 1]} ${range.slice(0, 4)}`,
	};
}
