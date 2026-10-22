import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoRollupInvalidationService } from '@/lib/mongo/rollup-invalidation/rollup-invalidation.service';
import { addDays, localClock, localDayBounds, todayIn } from '@/lib/util/Time';
import { firstActivityAtOrAfter, loadActivity } from './activity-stream';

import { computeTotals, type DayTotals, type EngineHeartbeat } from './engine';

import type { IDailySummaryZodSchema } from '@/lib/mongo/zod';

export interface StatsSettings {
	timezone: string;
	timeoutMinutes: number;
	writesOnly: boolean;
}

/** Narrows which heartbeats count. Any filter bypasses the rollup cache, since rollups hold unfiltered totals. */
export interface StatsFilter {
	project?: string;
	branches?: string[];
	/** Match any of these (goals combine several dimensions; values are the stored names, e.g. "VS Code"). */
	projects?: string[];
	languages?: string[];
	editors?: string[];
	categories?: string[];
}

const anyOf = (values: string[] | undefined) => (values?.length ? { $in: values } : undefined);

export const isFiltered = (filter: StatsFilter) =>
	Boolean(
		filter.project ||
		filter.branches?.length ||
		filter.projects?.length ||
		filter.languages?.length ||
		filter.editors?.length ||
		filter.categories?.length,
	);

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
	hours: Array.from({ length: 24 }, () => 0),
});

export function heartbeatFilter(settings: StatsSettings, filter: StatsFilter): Record<string, unknown> {
	const match: Record<string, unknown> = settings.writesOnly ? { isWrite: true } : {};
	// A single project inside a project allow-list (an org dashboard's scope) must not escape that list.
	const project = filter.project
		? filter.projects?.length && !filter.projects.includes(filter.project)
			? { $in: [] }
			: filter.project
		: anyOf(filter.projects);
	if (project) match.project = project;
	if (filter.branches?.length) match.branch = { $in: filter.branches };
	if (filter.languages?.length) match.language = { $in: filter.languages };
	if (filter.editors?.length) match.editor = { $in: filter.editors };
	if (filter.categories?.length) match.category = { $in: filter.categories };
	return match;
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
	hours: rollup.hours!,
});

/**
 * Bump whenever what a rollup stores, or how the engine computes it, changes. Rollups with any other version are
 * treated as cache misses and rebuilt, so a deploy never serves totals computed by older code.
 * 2: per-hour totals.
 */
export const ROLLUP_VERSION = 2;

const isCurrentRollup = (rollup: IDailySummaryZodSchema) => rollup.version === ROLLUP_VERSION;

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
	const cacheable = !isFiltered(filter);
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
		for (const rollup of rollups) if (isCurrentRollup(rollup)) result.set(rollup.date, fromRollup(rollup));
	}

	const missing = dates.filter((date) => !result.has(date));
	// Read before any heartbeat: if a date's generation moves while we compute, we may have missed that activity.
	const generationsBefore = cacheable
		? await mongoRollupInvalidationService.generations(
				userId,
				missing.filter((date) => date < today),
			)
		: new Map<string, number>();
	const extraFilter = heartbeatFilter(settings, filter);
	const timeoutSeconds = settings.timeoutMinutes * 60;
	const clock = localClock(settings.timezone);
	const toStore: { date: string; totals: DayTotals }[] = [];

	await Promise.all(
		contiguousRuns(missing).map(async (run) => {
			const runStart = localDayBounds(run[0], settings.timezone).start;
			const runEnd = localDayBounds(run.at(-1)!, settings.timezone).end;
			const [heartbeats, afterRun] = await Promise.all([
				loadActivity(userId, runStart, runEnd, extraFilter, ENGINE_FIELDS) as Promise<EngineHeartbeat[]>,
				firstActivityAtOrAfter(userId, runEnd, extraFilter),
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
					clock,
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
						{ $set: { ...stored, version: ROLLUP_VERSION }, $setOnInsert: { ...rollupKey, date } },
						{ upsert: true, setDefaultsOnInsert: true },
					)
					.catch((error: unknown) => console.warn('Failed to cache daily summary', error));
			}),
		);
		// Write, then check: an invalidation bumps before it deletes, so either the bump shows here (and we drop our
		// rollup) or its delete runs after our write (and drops it). No rollup outlives activity it didn't include.
		const generationsAfter = await mongoRollupInvalidationService.generations(
			userId,
			toStore.map(({ date }) => date),
		);
		const stale = toStore
			.map(({ date }) => date)
			.filter((date) => generationsAfter.get(date) !== generationsBefore.get(date));
		if (stale.length) await mongoDailySummaryService.deleteMany({ ...rollupKey, date: { $in: stale } });
	}

	return result;
}
