import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { eachDate, humanizeSeconds, localDateOf, localDayBounds, round, todayIn, weekdayOf } from '@/lib/util/Time';
import { emptyTotals, loadDayTotals } from '@/server/stats/day-totals';
import { type DayTotals } from '@/server/stats/engine';
import { resolveStatsRange, type DateRange } from '@/server/stats/ranges';
import { dailyAverage, toStatItems } from '@/server/stats/stats.response.dto';
import { statsService, sumTotals } from '@/server/stats/stats.service';

import type { InsightQuery, InsightType } from './insight.request.dto';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface InsightRange {
	dates: string[];
	days: DayTotals[];
	resolved: DateRange;
	weekStartDay: number;
	settings: Awaited<ReturnType<typeof statsService.resolveSettings>>;
}

const isoAt = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

/** Pure insight builders over a range of day totals. Each returns the payload stored under its type's key. */
export const insightBuilders = {
	weekdays({ dates, days, weekStartDay }: InsightRange) {
		const buckets = WEEKDAY_NAMES.map((name, weekday) => ({
			name,
			weekday,
			days: 0,
			active_days: 0,
			total_seconds: 0,
		}));
		dates.forEach((date, index) => {
			const bucket = buckets[weekdayOf(date)];
			bucket.days++;
			bucket.total_seconds += days[index].totalSeconds;
			if (days[index].totalSeconds > 0) bucket.active_days++;
		});
		return Array.from({ length: 7 }, (_, offset) => buckets[(weekStartDay + offset) % 7]).map((bucket) => {
			const average = bucket.days ? bucket.total_seconds / bucket.days : 0;
			return {
				...bucket,
				total_seconds: round(bucket.total_seconds),
				average_seconds: round(average),
				text: humanizeSeconds(bucket.total_seconds),
				average_text: humanizeSeconds(average),
			};
		});
	},

	days({ dates, days }: InsightRange, weekday?: number) {
		return dates
			.map((date, index) => ({
				date,
				total_seconds: round(days[index].totalSeconds),
				text: humanizeSeconds(days[index].totalSeconds),
			}))
			.filter((day) => weekday === undefined || weekdayOf(day.date) === weekday);
	},

	ai_days({ dates, days }: InsightRange) {
		return dates.map((date, index) => ({
			date,
			total_seconds: round(days[index].totalSeconds),
			ai_line_changes: days[index].aiLineChanges,
			human_line_changes: days[index].humanLineChanges,
			ai_sessions: days[index].aiSessions,
			ai_input_tokens: days[index].aiInputTokens,
			ai_output_tokens: days[index].aiOutputTokens,
		}));
	},

	best_day({ dates, days }: InsightRange) {
		let best: { date: string; total_seconds: number; text: string } | null = null;
		dates.forEach((date, index) => {
			const seconds = days[index].totalSeconds;
			if (seconds > (best?.total_seconds ?? 0))
				best = { date, total_seconds: round(seconds), text: humanizeSeconds(seconds) };
		});
		return best;
	},

	daily_average({ days }: InsightRange) {
		return dailyAverage(days);
	},

	/** Credited seconds per local hour of day; `average_seconds` is per active day. */
	hours({ days }: InsightRange) {
		const total = sumTotals(days);
		const active = days.filter((day) => day.totalSeconds > 0).length;
		return total.hours.map((seconds, hour) => ({
			hour,
			total_seconds: round(seconds),
			average_seconds: active ? round(seconds / active) : 0,
			text: humanizeSeconds(seconds),
			percent: total.totalSeconds ? round((seconds / total.totalSeconds) * 100) : 0,
		}));
	},
};

class InsightService {
	/** Day totals for a stats-style range; days before the first heartbeat are empty, not loaded. */
	public async loadRange(userId: string, range: string, overrides: InsightQuery = {}): Promise<InsightRange> {
		const settings = await statsService.resolveSettings(userId, overrides);
		const today = todayIn(settings.timezone);
		const first = await mongoHeartbeatService.findFirst(userId);
		const firstDate = first ? localDateOf(first.time, settings.timezone) : null;
		const resolved = resolveStatsRange(range, today, firstDate);

		const dates = eachDate(resolved.start, resolved.end);
		const loadable = firstDate ? dates.filter((date) => date >= firstDate) : [];
		const totals = loadable.length ? await loadDayTotals(userId, loadable, settings) : new Map<string, DayTotals>();

		return {
			dates,
			days: dates.map((date) => totals.get(date) ?? emptyTotals()),
			resolved,
			weekStartDay: settings.weekStartDay,
			settings,
		};
	}

	public async getInsight(userId: string, type: InsightType, range: string, query: InsightQuery) {
		if (type === 'stats') return { data: { ...(await statsService.getStats(userId, range, query)).data } };

		const loaded = await this.loadRange(userId, range, query);
		const { resolved, settings } = loaded;
		const total = sumTotals(loaded.days);

		const payload = (() => {
			switch (type) {
				case 'weekdays':
					return insightBuilders.weekdays(loaded);
				case 'days':
					return insightBuilders.days(loaded, query.weekday);
				case 'ai_days':
					return insightBuilders.ai_days(loaded);
				case 'best_day':
					return insightBuilders.best_day(loaded);
				case 'daily_average':
					return insightBuilders.daily_average(loaded);
				case 'hours':
					return insightBuilders.hours(loaded);
				case 'projects':
					return toStatItems(total.projects, total.totalSeconds);
				case 'languages':
					return toStatItems(total.languages, total.totalSeconds);
				case 'editors':
					return toStatItems(total.editors, total.totalSeconds);
				case 'categories':
					return toStatItems(total.categories, total.totalSeconds);
				case 'machines':
					return toStatItems(total.machines, total.totalSeconds);
				case 'operating_systems':
					return toStatItems(total.operatingSystems, total.totalSeconds);
			}
		})();

		return {
			data: {
				[type]: payload,
				range,
				human_readable_range: resolved.text,
				start: isoAt(localDayBounds(resolved.start, settings.timezone).start),
				end: isoAt(localDayBounds(resolved.end, settings.timezone).end - 1),
				timezone: settings.timezone,
				timeout: settings.timeoutMinutes,
				writes_only: settings.writesOnly,
				status: 'ok',
				is_up_to_date: true,
				percent_calculated: 100,
				user_id: userId,
			},
		};
	}
}

export const insightService = new InsightService();
