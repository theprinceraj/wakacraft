import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { localDateOf, todayIn } from '@/lib/util/Time';
import { insightBuilders, insightService } from '@/server/insight/insight.service';
import { statsService, sumTotals } from '@/server/stats/stats.service';

import type { StatTotal } from '@/server/stats/engine';

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

const top = (items: StatTotal[], count: number, total: number) =>
	items
		.filter((item) => item.totalSeconds > 0 && item.name !== 'Other')
		.slice(0, count)
		.map((item) => ({
			name: item.name,
			seconds: item.totalSeconds,
			percent: total ? (item.totalSeconds / total) * 100 : 0,
		}));

export interface WrappedView {
	year: number;
	years: number[];
	totalSeconds: number;
	previousYearSeconds: number | null;
	activeDays: number;
	daysInRange: number;
	dailyAverageSeconds: number;
	longestStreak: number;
	bestDay: { date: string; total_seconds: number } | null;
	busiestMonth: { name: string; seconds: number } | null;
	months: { name: string; seconds: number }[];
	peakHour: number | null;
	peakWeekday: string | null;
	languages: { name: string; seconds: number; percent: number }[];
	projects: { name: string; seconds: number; percent: number }[];
	editors: { name: string; seconds: number; percent: number }[];
	newLanguages: string[];
	aiLineChanges: number;
	humanLineChanges: number;
}

class WrappedService {
	/** Years with activity, newest first. */
	public async years(userId: string): Promise<number[]> {
		const [{ timezone }, first] = await Promise.all([
			statsService.resolveSettings(userId),
			mongoHeartbeatService.findFirst(userId),
		]);
		const current = Number(todayIn(timezone).slice(0, 4));
		if (!first) return [current];
		const firstYear = Number(localDateOf(first.time, timezone).slice(0, 4));
		return Array.from({ length: current - firstYear + 1 }, (_, index) => current - index);
	}

	public async getView(userId: string, year: number): Promise<WrappedView> {
		const years = await this.years(userId);
		const [loaded, previous] = await Promise.all([
			insightService.loadRange(userId, String(year)),
			years.includes(year - 1) ? insightService.loadRange(userId, String(year - 1)) : null,
		]);
		const total = sumTotals(loaded.days);
		const previousTotal = previous ? sumTotals(previous.days) : null;
		const active = loaded.days.filter((day) => day.totalSeconds > 0).length;

		let longestStreak = 0;
		let run = 0;
		for (const day of loaded.days) {
			run = day.totalSeconds > 0 ? run + 1 : 0;
			longestStreak = Math.max(longestStreak, run);
		}

		const months = MONTHS.map((name) => ({ name, seconds: 0 }));
		loaded.dates.forEach((date, index) => {
			months[Number(date.slice(5, 7)) - 1].seconds += loaded.days[index].totalSeconds;
		});
		const busiest = months.reduce((best, month) => (month.seconds > best.seconds ? month : best), months[0]);

		const hours = insightBuilders.hours(loaded);
		const weekdays = insightBuilders.weekdays(loaded);
		const previousLanguages = new Set(previousTotal?.languages.map((language) => language.name) ?? []);

		return {
			year,
			years,
			totalSeconds: total.totalSeconds,
			previousYearSeconds: previousTotal ? previousTotal.totalSeconds : null,
			activeDays: active,
			daysInRange: loaded.dates.length,
			dailyAverageSeconds: active ? total.totalSeconds / active : 0,
			longestStreak,
			bestDay: insightBuilders.best_day(loaded),
			busiestMonth: busiest.seconds ? busiest : null,
			months,
			peakHour: total.totalSeconds
				? hours.reduce((best, hour) => (hour.total_seconds > best.total_seconds ? hour : best)).hour
				: null,
			peakWeekday: total.totalSeconds
				? weekdays.reduce((best, day) => (day.total_seconds > best.total_seconds ? day : best)).name
				: null,
			languages: top(total.languages, 5, total.totalSeconds),
			projects: top(total.projects, 5, total.totalSeconds),
			editors: top(total.editors, 3, total.totalSeconds),
			// Only meaningful when there is a previous year to compare with.
			newLanguages: previousTotal
				? total.languages
						.filter(
							(language) =>
								language.totalSeconds > 0 && language.name !== 'Other' && !previousLanguages.has(language.name),
						)
						.map((language) => language.name)
				: [],
			aiLineChanges: total.aiLineChanges,
			humanLineChanges: total.humanLineChanges,
		};
	}
}

export const wrappedService = new WrappedService();
