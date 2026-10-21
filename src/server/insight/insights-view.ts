import { sumTotals } from '@/server/stats/stats.service';

import { insightBuilders, insightService } from './insight.service';

import type { Breakdown } from '@/server/dashboard/dashboard.service';
import type { StatTotal } from '@/server/stats/engine';

/** Ranges the Insights page offers, keyed by their stats-range value. */
export const InsightRanges = {
	last_7_days: '7D',
	last_30_days: '30D',
	last_6_months: '6M',
	last_year: '1Y',
	all_time: 'All',
} as const;
export type InsightRangeKey = keyof typeof InsightRanges;
export const isInsightRange = (value: unknown): value is InsightRangeKey =>
	typeof value === 'string' && value in InsightRanges;

const TOP_LANGUAGES = 5;

export interface InsightsView {
	range: { key: InsightRangeKey; label: string; start: string; end: string; days: number };
	totals: { seconds: number; activeDays: number; dailyAverageSeconds: number };
	bestDay: { date: string; total_seconds: number } | null;
	peakHour: number | null;
	peakWeekday: string | null;
	hours: { hour: number; seconds: number; average: number }[];
	weekdays: { name: string; average: number }[];
	/** One point per day (≤ 92 days) or per week/month bucket, with a trailing average for the trend line. */
	trend: { label: string; seconds: number; average: number }[];
	languagesOverTime: { label: string; series: Record<string, number> }[];
	languageNames: string[];
	ai: { label: string; ai: number; human: number }[];
	projects: Breakdown[];
	editors: Breakdown[];
	categories: Breakdown[];
}

const toBreakdown = (items: StatTotal[], total: number): Breakdown[] =>
	items
		.filter((item) => item.totalSeconds > 0)
		.map((item) => ({
			name: item.name,
			seconds: item.totalSeconds,
			percent: total ? (item.totalSeconds / total) * 100 : 0,
		}));

/** Bucket key for a date: the date itself, its week's first day, or its month. */
function bucketer(days: number) {
	if (days <= 92) return { size: 'day' as const, key: (date: string) => date };
	if (days <= 400) {
		return {
			size: 'week' as const,
			key: (date: string) => {
				const [year, month, day] = date.split('-').map(Number);
				const utc = new Date(Date.UTC(year, month - 1, day));
				utc.setUTCDate(utc.getUTCDate() - ((utc.getUTCDay() + 6) % 7));
				return utc.toISOString().slice(0, 10);
			},
		};
	}
	return { size: 'month' as const, key: (date: string) => date.slice(0, 7) };
}

export async function getInsightsView(userId: string, key: InsightRangeKey): Promise<InsightsView> {
	const loaded = await insightService.loadRange(userId, key);
	const { dates, days } = loaded;
	const total = sumTotals(days);
	const active = days.filter((day) => day.totalSeconds > 0).length;

	const hours = insightBuilders
		.hours(loaded)
		.map((hour) => ({ hour: hour.hour, seconds: hour.total_seconds, average: hour.average_seconds }));
	const peakHour = total.totalSeconds
		? hours.reduce((best, hour) => (hour.seconds > best.seconds ? hour : best)).hour
		: null;
	const weekdays = insightBuilders.weekdays(loaded).map((day) => ({ name: day.name, average: day.average_seconds }));
	const peakWeekday = total.totalSeconds
		? weekdays.reduce((best, day) => (day.average > best.average ? day : best)).name
		: null;

	const { size, key: bucketKey } = bucketer(dates.length);
	const buckets = new Map<string, { seconds: number; languages: Map<string, number>; ai: number; human: number }>();
	dates.forEach((date, index) => {
		const label = bucketKey(date);
		let bucket = buckets.get(label);
		if (!bucket) buckets.set(label, (bucket = { seconds: 0, languages: new Map(), ai: 0, human: 0 }));
		const day = days[index];
		bucket.seconds += day.totalSeconds;
		bucket.ai += day.aiLineChanges;
		bucket.human += day.humanLineChanges;
		for (const language of day.languages)
			bucket.languages.set(language.name, (bucket.languages.get(language.name) ?? 0) + language.totalSeconds);
	});

	const labels = [...buckets.keys()];
	const window = size === 'day' ? 7 : 4;
	const trend = labels.map((label, index) => {
		const slice = labels.slice(Math.max(0, index - window + 1), index + 1);
		const average = slice.reduce((sum, item) => sum + buckets.get(item)!.seconds, 0) / slice.length;
		return { label, seconds: buckets.get(label)!.seconds, average };
	});

	const languageNames = total.languages
		.filter((language) => language.name !== 'Other')
		.slice(0, TOP_LANGUAGES)
		.map((language) => language.name);

	return {
		range: {
			key,
			label: loaded.resolved.text,
			start: loaded.resolved.start,
			end: loaded.resolved.end,
			days: dates.length,
		},
		totals: {
			seconds: total.totalSeconds,
			activeDays: active,
			dailyAverageSeconds: active ? total.totalSeconds / active : 0,
		},
		bestDay: insightBuilders.best_day(loaded),
		peakHour,
		peakWeekday,
		hours,
		weekdays,
		trend,
		languagesOverTime: labels.map((label) => ({
			label,
			series: Object.fromEntries(languageNames.map((name) => [name, buckets.get(label)!.languages.get(name) ?? 0])),
		})),
		languageNames,
		ai: labels.map((label) => ({ label, ai: buckets.get(label)!.ai, human: buckets.get(label)!.human })),
		projects: toBreakdown(total.projects, total.totalSeconds),
		editors: toBreakdown(total.editors, total.totalSeconds),
		categories: toBreakdown(total.categories, total.totalSeconds),
	};
}
