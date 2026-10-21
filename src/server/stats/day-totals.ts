import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';

import { computeTotals, type DayTotals, type EngineHeartbeat } from './engine';

import type { IDailySummaryZodSchema } from '@/lib/mongo/zod';

export interface StatsSettings {
	timezone: string;
	timeoutMinutes: number;
	writesOnly: boolean;
}

export interface StatsFilter {
	project?: string;
	branches?: string[];
}

/** Only the fields the engine reads — heartbeats are the bulk of the data, so don't drag the rest along. */
const ENGINE_FIELDS =
	'time entity category project branch language editor operatingSystem machine dependencies aiLineChanges humanLineChanges aiInputTokens aiCachedInputTokens aiOutputTokens aiSession';

export const emptyTotals = (): DayTotals => ({
	totalSeconds: 0,
	aiLineChanges: 0,
	humanLineChanges: 0,
	aiInputTokens: 0,
	aiCachedInputTokens: 0,
	aiOutputTokens: 0,
	aiSessions: 0,
	projects: [],
	languages: [],
	editors: [],
	operatingSystems: [],
	categories: [],
	machines: [],
	dependencies: [],
	branches: [],
	entities: [],
});

export function heartbeatFilter(settings: StatsSettings, filter: StatsFilter): Record<string, unknown> {
	return {
		...(settings.writesOnly ? { isWrite: true } : {}),
		...(filter.project ? { project: filter.project } : {}),
		...(filter.branches?.length ? { branch: { $in: filter.branches } } : {}),
	};
}

const fromRollup = (rollup: IDailySummaryZodSchema): DayTotals => ({
	...emptyTotals(),
	totalSeconds: rollup.totalSeconds,
	aiLineChanges: rollup.aiLineChanges,
	humanLineChanges: rollup.humanLineChanges,
	aiInputTokens: rollup.aiInputTokens,
	aiCachedInputTokens: rollup.aiCachedInputTokens,
	aiOutputTokens: rollup.aiOutputTokens,
	aiSessions: rollup.aiSessions,
	projects: rollup.projects,
	languages: rollup.languages,
	editors: rollup.editors,
	operatingSystems: rollup.operatingSystems,
	categories: rollup.categories,
	machines: rollup.machines,
	dependencies: rollup.dependencies,
});

/** Splits a sorted date list into runs of consecutive days, so each run costs one heartbeat query. */
function contiguousRuns(dates: string[]): string[][] {
	const runs: string[][] = [];
	for (const date of dates) {
		const run = runs.at(-1);
		if (run && addDays(run.at(-1)!, 1) === date) run.push(date);
		else runs.push([date]);
	}
	return runs;
}

/**
 * Per-day totals for `dates` (sorted, YYYY-MM-DD in `settings.timezone`).
 *
 * Finished days without a project/branch filter come from the `DailySummary` rollup when present, and are written
 * back after computing. Today and filtered queries are always computed from heartbeats.
 */
export async function loadDayTotals(
	userId: string,
	dates: string[],
	settings: StatsSettings,
	filter: StatsFilter = {},
): Promise<Map<string, DayTotals>> {
	const result = new Map<string, DayTotals>();
	if (!dates.length) return result;

	const today = todayIn(settings.timezone);
	const cacheable = !filter.project && !filter.branches?.length;
	const rollupKey = {
		userId,
		timezone: settings.timezone,
		timeout: settings.timeoutMinutes,
		writesOnly: settings.writesOnly,
	};

	if (cacheable) {
		const rollups = await mongoDailySummaryService.find({
			...rollupKey,
			date: { $in: dates.filter((d) => d < today) },
		});
		for (const rollup of rollups) result.set(rollup.date, fromRollup(rollup));
	}

	const missing = dates.filter((date) => !result.has(date));
	const extraFilter = heartbeatFilter(settings, filter);
	const timeoutSeconds = settings.timeoutMinutes * 60;
	const toStore: { date: string; totals: DayTotals }[] = [];

	await Promise.all(
		contiguousRuns(missing).map(async (run) => {
			const runStart = localDayBounds(run[0], settings.timezone).start;
			const runEnd = localDayBounds(run.at(-1)!, settings.timezone).end;
			const [heartbeats, afterRun] = await Promise.all([
				mongoHeartbeatService.findInRange(userId, runStart, runEnd, extraFilter, ENGINE_FIELDS) as Promise<
					EngineHeartbeat[]
				>,
				mongoHeartbeatService.findFirstAtOrAfter(userId, runEnd, extraFilter),
			]);

			let cursor = 0;
			for (const date of run) {
				const { end } = localDayBounds(date, settings.timezone);
				const from = cursor;
				while (cursor < heartbeats.length && heartbeats[cursor].time < end) cursor++;

				const totals = computeTotals(heartbeats.slice(from, cursor), {
					timeoutSeconds,
					rangeEnd: end,
					nextAfterRange: heartbeats[cursor] ?? afterRun,
				});
				result.set(date, totals);
				if (cacheable && date < today) toStore.push({ date, totals });
			}
		}),
	);

	if (toStore.length) {
		await Promise.all(
			toStore.map(({ date, totals }) => {
				const { branches: _branches, entities: _entities, ...stored } = totals;
				return mongoDailySummaryService
					.updateOne(
						{ ...rollupKey, date },
						{ $set: stored, $setOnInsert: { ...rollupKey, date } },
						{ upsert: true, setDefaultsOnInsert: true },
					)
					.catch((error: unknown) => console.warn('Failed to cache daily summary', error));
			}),
		);
	}

	return result;
}
