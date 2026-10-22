import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { addDays, eachDate, localDayBounds, todayIn, weekdayOf } from '@/lib/util/Time';
import { loadDayTotals } from '@/server/stats/day-totals';
import { computeDurations, type DayTotals, type EngineHeartbeat, type StatTotal } from '@/server/stats/engine';
import { resolveSummaryRange, type SummaryRangeName } from '@/server/stats/ranges';
import { statsService, sumTotals } from '@/server/stats/stats.service';
import { firstActivityAtOrAfter, loadActivity } from '@/server/stats/activity-stream';

/** Ranges offered by the dashboard's range picker, keyed by URL slug. */
export const DashboardRanges = {
	today: 'Today',
	yesterday: 'Yesterday',
	'7d': 'Last 7 Days',
	'14d': 'Last 14 Days',
	'30d': 'Last 30 Days',
	week: 'This Week',
	month: 'This Month',
	'last-month': 'Last Month',
} as const satisfies Record<string, SummaryRangeName>;
export type DashboardRangeSlug = keyof typeof DashboardRanges;
export const isDashboardRange = (value: unknown): value is DashboardRangeSlug =>
	typeof value === 'string' && value in DashboardRanges;

export const HEATMAP_WEEKS = 53;
const TOP_SERIES = 6;
export const OTHER_SERIES = 'Other';

export interface Breakdown {
	name: string;
	seconds: number;
	percent: number;
}

export interface TimelineBlock {
	lane: string;
	start: number;
	duration: number;
}

export interface DashboardView {
	timezone: string;
	weekStartDay: number;
	range: { slug: DashboardRangeSlug; label: string; start: string; end: string; days: number };
	hasAnyActivity: boolean;
	totals: {
		rangeSeconds: number;
		todaySeconds: number;
		yesterdaySeconds: number;
		dailyAverageSeconds: number;
		activeDays: number;
		streakDays: number;
		longestStreakDays: number;
		bestDay: { date: string; seconds: number } | null;
		aiLineChanges: number;
		humanLineChanges: number;
	};
	/** One row per day in range; `series` holds seconds per top project (rest folded into "Other"). */
	daily: { date: string; total: number; series: Record<string, number> }[];
	seriesNames: string[];
	projectColors: Record<string, string | null>;
	projects: Breakdown[];
	languages: Breakdown[];
	editors: Breakdown[];
	operatingSystems: Breakdown[];
	categories: Breakdown[];
	machines: Breakdown[];
	weekdays: { weekday: number; seconds: number }[];
	heatmap: { date: string; seconds: number }[];
	timeline: { date: string; start: number; end: number; lanes: string[]; blocks: TimelineBlock[] };
}

const toBreakdown = (items: StatTotal[], total: number): Breakdown[] =>
	items
		.filter((item) => item.totalSeconds > 0)
		.map((item) => ({
			name: item.name,
			seconds: item.totalSeconds,
			percent: total > 0 ? (item.totalSeconds / total) * 100 : 0,
		}));

function streaks(dates: string[], totals: Map<string, DayTotals>, today: string) {
	let longest = 0;
	let run = 0;
	for (const date of dates) {
		run = (totals.get(date)?.totalSeconds ?? 0) > 0 ? run + 1 : 0;
		longest = Math.max(longest, run);
	}

	// A streak survives an empty today: it is still alive until today ends.
	let current = 0;
	let cursor = (totals.get(today)?.totalSeconds ?? 0) > 0 ? today : addDays(today, -1);
	while ((totals.get(cursor)?.totalSeconds ?? 0) > 0) {
		current++;
		cursor = addDays(cursor, -1);
	}
	return { current, longest };
}

class DashboardService {
	public async getView(userId: string, slug: DashboardRangeSlug, timelineDate?: string): Promise<DashboardView> {
		const settings = await statsService.resolveSettings(userId);
		const today = todayIn(settings.timezone);
		const range = resolveSummaryRange(DashboardRanges[slug], today, settings.weekStartDay);

		// The heatmap window ends on today and starts on the week-start day HEATMAP_WEEKS back.
		const heatmapEnd = today;
		const heatmapStartRaw = addDays(today, -(HEATMAP_WEEKS * 7 - 1));
		const heatmapStart = addDays(heatmapStartRaw, -((weekdayOf(heatmapStartRaw) - settings.weekStartDay + 7) % 7));
		const windowStart = range.start < heatmapStart ? range.start : heatmapStart;
		const windowDates = eachDate(windowStart, heatmapEnd);

		const day = timelineDate && timelineDate <= today ? timelineDate : today;
		const { start: dayStart, end: dayEnd } = localDayBounds(day, settings.timezone);

		const [totals, timelineHeartbeats, afterTimeline, projectDocs, firstHeartbeat] = await Promise.all([
			loadDayTotals(userId, windowDates, settings),
			loadActivity(
				userId,
				dayStart,
				dayEnd,
				settings.writesOnly ? { isWrite: true } : {},
				'time entity category project language',
			) as Promise<EngineHeartbeat[]>,
			firstActivityAtOrAfter(userId, dayEnd, settings.writesOnly ? { isWrite: true } : {}),
			mongoProjectService.find({ userId }, ['name', 'color']),
			mongoHeartbeatService.findFirst(userId),
		]);

		const rangeDates = eachDate(range.start, range.end);
		const rangeDays = rangeDates.map((date) => totals.get(date)!);
		const rangeTotal = sumTotals(rangeDays);
		const active = rangeDays.filter((dayTotals) => dayTotals.totalSeconds > 0).length;
		const best = rangeDates.reduce<{ date: string; seconds: number } | null>((winner, date) => {
			const seconds = totals.get(date)!.totalSeconds;
			return seconds > (winner?.seconds ?? 0) ? { date, seconds } : winner;
		}, null);
		const { current, longest } = streaks(windowDates, totals, today);

		const seriesNames = rangeTotal.projects.slice(0, TOP_SERIES).map((project) => project.name);
		const hasOther = rangeTotal.projects.length > TOP_SERIES;
		const daily = rangeDates.map((date) => {
			const dayTotals = totals.get(date)!;
			const series: Record<string, number> = Object.fromEntries(seriesNames.map((name) => [name, 0]));
			for (const project of dayTotals.projects) {
				if (project.name in series) series[project.name] += project.totalSeconds;
				else series[OTHER_SERIES] = (series[OTHER_SERIES] ?? 0) + project.totalSeconds;
			}
			return { date, total: dayTotals.totalSeconds, series };
		});

		const weekdays = Array.from({ length: 7 }, (_, weekday) => ({ weekday, seconds: 0 }));
		rangeDates.forEach((date, index) => {
			weekdays[weekdayOf(date)].seconds += rangeDays[index].totalSeconds;
		});

		const durations = computeDurations(timelineHeartbeats, 'project', {
			timeoutSeconds: settings.timeoutMinutes * 60,
			rangeEnd: dayEnd,
			nextAfterRange: afterTimeline,
		}).filter((duration) => duration.duration > 0);
		const lanes = [...new Set(durations.map((duration) => duration.key))];

		return {
			timezone: settings.timezone,
			weekStartDay: settings.weekStartDay,
			range: { slug, label: range.text, start: range.start, end: range.end, days: rangeDates.length },
			hasAnyActivity: firstHeartbeat !== null,
			totals: {
				rangeSeconds: rangeTotal.totalSeconds,
				todaySeconds: totals.get(today)?.totalSeconds ?? 0,
				yesterdaySeconds: totals.get(addDays(today, -1))?.totalSeconds ?? 0,
				dailyAverageSeconds: active ? rangeTotal.totalSeconds / active : 0,
				activeDays: active,
				streakDays: current,
				longestStreakDays: longest,
				bestDay: best,
				aiLineChanges: rangeTotal.aiLineChanges,
				humanLineChanges: rangeTotal.humanLineChanges,
			},
			daily,
			seriesNames: hasOther ? [...seriesNames, OTHER_SERIES] : seriesNames,
			projectColors: Object.fromEntries(projectDocs.map((project) => [project.name, project.color ?? null])),
			projects: toBreakdown(rangeTotal.projects, rangeTotal.totalSeconds),
			languages: toBreakdown(rangeTotal.languages, rangeTotal.totalSeconds),
			editors: toBreakdown(rangeTotal.editors, rangeTotal.totalSeconds),
			operatingSystems: toBreakdown(rangeTotal.operatingSystems, rangeTotal.totalSeconds),
			categories: toBreakdown(rangeTotal.categories, rangeTotal.totalSeconds),
			machines: toBreakdown(rangeTotal.machines, rangeTotal.totalSeconds),
			weekdays,
			heatmap: eachDate(heatmapStart, heatmapEnd).map((date) => ({
				date,
				seconds: totals.get(date)?.totalSeconds ?? 0,
			})),
			timeline: {
				date: day,
				start: dayStart,
				end: dayEnd,
				lanes,
				blocks: durations.map((duration) => ({
					lane: duration.key,
					start: duration.start,
					duration: duration.duration,
				})),
			},
		};
	}
}

export const dashboardService = new DashboardService();
