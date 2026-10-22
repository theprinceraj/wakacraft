import { mongoGlobalStatsService } from '@/lib/mongo/global-stats/global-stats.service';
import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { inBatches } from '@/lib/util/Async';
import { addDays, eachDate, humanizeSeconds, round, todayIn } from '@/lib/util/Time';
import { loadDayTotals } from '@/server/stats/day-totals';
import { statsService, sumTotals } from '@/server/stats/stats.service';

import type { IGlobalStatsZodSchema } from '@/lib/mongo/zod';
import type { StatTotal } from '@/server/stats/engine';

export const GLOBAL_RANGES = { last_7_days: 7, last_30_days: 30 } as const;
export type GlobalRange = keyof typeof GLOBAL_RANGES;

const CACHE_MINUTES = 60;
const CONCURRENCY = 8;
const TOP_ITEMS = 100;

type Item = IGlobalStatsZodSchema['languages'][number];

/** Sums one dimension across users, counting how many users had each entry. */
class Accumulator {
	private readonly items = new Map<string, Item>();

	public add(list: readonly StatTotal[]) {
		for (const { name, totalSeconds } of list) {
			if (totalSeconds <= 0) continue;
			const item = this.items.get(name) ?? { name, totalSeconds: 0, users: 0 };
			item.totalSeconds += totalSeconds;
			item.users += 1;
			this.items.set(name, item);
		}
	}

	public top(): Item[] {
		return [...this.items.values()].sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, TOP_ITEMS);
	}
}

class GlobalStatsService {
	/**
	 * WakaTime's `GET /stats/:range`: what everyone codes in. Built only from users who made their coding time
	 * public, and each breakdown only from those who made that breakdown public too.
	 */
	public async getStats(range: GlobalRange) {
		const stats = await this.cached(range);
		const breakdown = (items: Item[]) => {
			const total = items.reduce((sum, item) => sum + item.totalSeconds, 0);
			return items.map((item) => ({
				name: item.name,
				total_seconds: round(item.totalSeconds),
				percent: total ? round((item.totalSeconds / total) * 100) : 0,
				users_count: item.users,
				average_daily_seconds_per_user: round(item.totalSeconds / item.users / GLOBAL_RANGES[range]),
				human_readable_total: humanizeSeconds(item.totalSeconds),
			}));
		};
		return {
			data: {
				range,
				start: stats.start,
				end: stats.end,
				users_count: stats.users,
				total_seconds: round(stats.totalSeconds),
				human_readable_total: humanizeSeconds(stats.totalSeconds),
				languages: breakdown(stats.languages),
				editors: breakdown(stats.editors),
				categories: breakdown(stats.categories),
				operating_systems: breakdown(stats.operatingSystems),
				modified_at: stats.computedAt.toISOString(),
			},
		};
	}

	private async cached(range: GlobalRange): Promise<IGlobalStatsZodSchema> {
		const cached = await mongoGlobalStatsService.findOne({ range });
		if (cached && Date.now() - cached.computedAt.getTime() < CACHE_MINUTES * 60_000) return cached;

		const profiles = await mongoUserProfileService.find({ loggedTimePublic: true }, [
			'userId',
			'languagesUsedPublic',
			'editorsUsedPublic',
			'categoriesUsedPublic',
			'osUsedPublic',
		]);
		const languages = new Accumulator();
		const editors = new Accumulator();
		const categories = new Accumulator();
		const operatingSystems = new Accumulator();
		let totalSeconds = 0;
		let users = 0;

		await inBatches(profiles, CONCURRENCY, async (profile) => {
			const settings = await statsService.resolveSettings(profile.userId);
			const today = todayIn(settings.timezone);
			const dates = eachDate(addDays(today, -(GLOBAL_RANGES[range] - 1)), today);
			const totals = await loadDayTotals(profile.userId, dates, settings);
			const rangeTotal = sumTotals(dates.map((date) => totals.get(date)!));
			if (rangeTotal.totalSeconds <= 0) return;
			users += 1;
			totalSeconds += rangeTotal.totalSeconds;
			if (profile.languagesUsedPublic) languages.add(rangeTotal.languages);
			if (profile.editorsUsedPublic) editors.add(rangeTotal.editors);
			if (profile.categoriesUsedPublic) categories.add(rangeTotal.categories);
			if (profile.osUsedPublic) operatingSystems.add(rangeTotal.operatingSystems);
		});

		const today = todayIn('UTC');
		const fields = {
			start: addDays(today, -(GLOBAL_RANGES[range] - 1)),
			end: today,
			users,
			totalSeconds,
			languages: languages.top(),
			editors: editors.top(),
			categories: categories.top(),
			operatingSystems: operatingSystems.top(),
			computedAt: new Date(),
		};
		return (await mongoGlobalStatsService.updateOne(
			{ range },
			{ $set: fields, $setOnInsert: { range } },
			{ upsert: true, setDefaultsOnInsert: true },
		))!;
	}
}

export const globalStatsService = new GlobalStatsService();
