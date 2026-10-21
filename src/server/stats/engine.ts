import {
	SliceBy,
	UNKNOWN_EDITOR,
	UNKNOWN_LANGUAGE,
	UNKNOWN_MACHINE,
	UNKNOWN_OS,
	UNKNOWN_PROJECT,
	type SliceByName,
} from '@/lib/util/Heartbeats';

/**
 * Pure time-accounting over heartbeats. No I/O, so the rules that decide "how much did I code" are tested
 * directly (see engine.test.ts).
 *
 * The rule, same as WakaTime: the gap between a heartbeat and the next one is credited to the first heartbeat
 * when it is at most the keystroke timeout; a longer gap means the user stopped, and credits nothing. Credit is
 * clipped to the end of the requested range so a session spanning midnight is split between the two days.
 */

export type EngineHeartbeat = {
	time: number;
	entity: string;
	category: string;
	project?: string | null;
	branch?: string | null;
	language?: string | null;
	editor?: string | null;
	operatingSystem?: string | null;
	machine?: string | null;
	dependencies?: string[] | null;
	aiLineChanges?: number | null;
	humanLineChanges?: number | null;
	aiInputTokens?: number | null;
	aiCachedInputTokens?: number | null;
	aiOutputTokens?: number | null;
	aiSession?: string | null;
};

export interface CreditOptions {
	timeoutSeconds: number;
	/** Credit is never given past this instant (epoch seconds). */
	rangeEnd: number;
	/** The first heartbeat after the range, so the last in-range heartbeat's gap can still be measured. */
	nextAfterRange?: Pick<EngineHeartbeat, 'time'> | null;
}

/** Seconds credited to each heartbeat, index-aligned with `heartbeats` (which must be sorted by time). */
export function creditSeconds(heartbeats: readonly EngineHeartbeat[], options: CreditOptions): number[] {
	return heartbeats.map((heartbeat, index) => {
		const next = heartbeats[index + 1] ?? options.nextAfterRange;
		if (!next) return 0;

		const gap = next.time - heartbeat.time;
		if (gap <= 0 || gap > options.timeoutSeconds) return 0;

		return Math.max(0, Math.min(gap, options.rangeEnd - heartbeat.time));
	});
}

const sliceValue = (heartbeat: EngineHeartbeat, sliceBy: SliceByName): string => {
	switch (sliceBy) {
		case SliceBy.Project:
			return heartbeat.project || UNKNOWN_PROJECT;
		case SliceBy.Entity:
			return heartbeat.entity;
		case SliceBy.Language:
			return heartbeat.language || UNKNOWN_LANGUAGE;
		case SliceBy.Dependencies:
			return heartbeat.dependencies?.join(', ') ?? '';
		case SliceBy.Os:
			return heartbeat.operatingSystem || UNKNOWN_OS;
		case SliceBy.Editor:
			return heartbeat.editor || UNKNOWN_EDITOR;
		case SliceBy.Category:
			return heartbeat.category;
		case SliceBy.Machine:
			return heartbeat.machine || UNKNOWN_MACHINE;
	}
};

export interface EngineDuration {
	/** Value of the slice dimension (project name, language, …). */
	key: string;
	project: string;
	start: number;
	duration: number;
	aiLineChanges: number;
	humanLineChanges: number;
}

/**
 * Merges consecutive heartbeats with the same slice value into durations — the blocks of the dashboard
 * timeline. A heartbeat continues the current block only if the block's credited time reaches it.
 */
export function computeDurations(
	heartbeats: readonly EngineHeartbeat[],
	sliceBy: SliceByName,
	options: CreditOptions,
): EngineDuration[] {
	const credits = creditSeconds(heartbeats, options);
	const durations: EngineDuration[] = [];
	let current: (EngineDuration & { end: number }) | null = null;

	heartbeats.forEach((heartbeat, index) => {
		const key = sliceValue(heartbeat, sliceBy);
		const project = heartbeat.project || UNKNOWN_PROJECT;
		const end = heartbeat.time + credits[index];

		if (current && current.key === key && current.project === project && heartbeat.time <= current.end) {
			current.end = Math.max(current.end, end);
			current.duration = current.end - current.start;
			current.aiLineChanges += heartbeat.aiLineChanges ?? 0;
			current.humanLineChanges += heartbeat.humanLineChanges ?? 0;
			return;
		}

		if (current) durations.push(stripEnd(current));
		current = {
			key,
			project,
			start: heartbeat.time,
			end,
			duration: end - heartbeat.time,
			aiLineChanges: heartbeat.aiLineChanges ?? 0,
			humanLineChanges: heartbeat.humanLineChanges ?? 0,
		};
	});

	if (current) durations.push(stripEnd(current));
	return durations;
}

const stripEnd = ({ end: _end, ...duration }: EngineDuration & { end: number }): EngineDuration => duration;

export interface StatTotal {
	name: string;
	totalSeconds: number;
	aiLineChanges: number;
	humanLineChanges: number;
}

export interface DayTotals {
	totalSeconds: number;
	aiLineChanges: number;
	humanLineChanges: number;
	aiInputTokens: number;
	aiCachedInputTokens: number;
	aiOutputTokens: number;
	aiSessions: number;
	projects: StatTotal[];
	languages: StatTotal[];
	editors: StatTotal[];
	operatingSystems: StatTotal[];
	categories: StatTotal[];
	machines: StatTotal[];
	dependencies: StatTotal[];
	branches: StatTotal[];
	entities: StatTotal[];
	/** Credited seconds per local hour of day (24 entries); zeros when no clock was supplied. */
	hours: number[];
}

/** Local wall-clock position of an instant: which hour it falls in and how far into that hour it is. */
export type LocalClock = (epochSeconds: number) => { hour: number; secondsIntoHour: number };

/** Adds `seconds` starting at `start` into per-hour buckets, splitting at local hour boundaries. */
function addToHours(hours: number[], start: number, seconds: number, clock: LocalClock) {
	let time = start;
	let remaining = seconds;
	while (remaining > 0) {
		const { hour, secondsIntoHour } = clock(time);
		const chunk = Math.min(remaining, 3600 - secondsIntoHour);
		hours[hour] += chunk;
		time += chunk;
		remaining -= chunk;
	}
}

class Tally {
	private readonly totals = new Map<string, StatTotal>();

	public add(name: string, seconds: number, heartbeat: EngineHeartbeat) {
		let total = this.totals.get(name);
		if (!total) {
			total = { name, totalSeconds: 0, aiLineChanges: 0, humanLineChanges: 0 };
			this.totals.set(name, total);
		}
		total.totalSeconds += seconds;
		total.aiLineChanges += heartbeat.aiLineChanges ?? 0;
		total.humanLineChanges += heartbeat.humanLineChanges ?? 0;
	}

	/** Largest first; zero-second rows are dropped unless they carry line changes. */
	public sorted(): StatTotal[] {
		return [...this.totals.values()]
			.filter((total) => total.totalSeconds > 0 || total.aiLineChanges > 0 || total.humanLineChanges > 0)
			.sort((a, b) => b.totalSeconds - a.totalSeconds || a.name.localeCompare(b.name));
	}
}

/** Totals for one range (typically one local day), broken down by every summary dimension. */
export function computeTotals(
	heartbeats: readonly EngineHeartbeat[],
	options: CreditOptions & { clock?: LocalClock },
): DayTotals {
	const credits = creditSeconds(heartbeats, options);
	const hours = Array.from({ length: 24 }, () => 0);
	const tallies = {
		projects: new Tally(),
		languages: new Tally(),
		editors: new Tally(),
		operatingSystems: new Tally(),
		categories: new Tally(),
		machines: new Tally(),
		dependencies: new Tally(),
		branches: new Tally(),
		entities: new Tally(),
	};
	const aiSessions = new Set<string>();
	const totals = {
		totalSeconds: 0,
		aiLineChanges: 0,
		humanLineChanges: 0,
		aiInputTokens: 0,
		aiCachedInputTokens: 0,
		aiOutputTokens: 0,
	};

	heartbeats.forEach((heartbeat, index) => {
		const seconds = credits[index];

		totals.totalSeconds += seconds;
		if (options.clock && seconds > 0) addToHours(hours, heartbeat.time, seconds, options.clock);
		totals.aiLineChanges += heartbeat.aiLineChanges ?? 0;
		totals.humanLineChanges += heartbeat.humanLineChanges ?? 0;
		totals.aiInputTokens += heartbeat.aiInputTokens ?? 0;
		totals.aiCachedInputTokens += heartbeat.aiCachedInputTokens ?? 0;
		totals.aiOutputTokens += heartbeat.aiOutputTokens ?? 0;
		if (heartbeat.aiSession) aiSessions.add(heartbeat.aiSession);

		tallies.projects.add(heartbeat.project || UNKNOWN_PROJECT, seconds, heartbeat);
		tallies.languages.add(heartbeat.language || UNKNOWN_LANGUAGE, seconds, heartbeat);
		tallies.editors.add(heartbeat.editor || UNKNOWN_EDITOR, seconds, heartbeat);
		tallies.operatingSystems.add(heartbeat.operatingSystem || UNKNOWN_OS, seconds, heartbeat);
		tallies.categories.add(heartbeat.category, seconds, heartbeat);
		tallies.machines.add(heartbeat.machine || UNKNOWN_MACHINE, seconds, heartbeat);
		tallies.entities.add(heartbeat.entity, seconds, heartbeat);
		if (heartbeat.branch) tallies.branches.add(heartbeat.branch, seconds, heartbeat);
		for (const dependency of heartbeat.dependencies ?? []) tallies.dependencies.add(dependency, seconds, heartbeat);
	});

	return {
		...totals,
		aiSessions: aiSessions.size,
		projects: tallies.projects.sorted(),
		languages: tallies.languages.sorted(),
		editors: tallies.editors.sorted(),
		operatingSystems: tallies.operatingSystems.sorted(),
		categories: tallies.categories.sorted(),
		machines: tallies.machines.sorted(),
		dependencies: tallies.dependencies.sorted(),
		branches: tallies.branches.sorted(),
		entities: tallies.entities.sorted(),
		hours,
	};
}

/** Element-wise sum of per-hour arrays. */
export const mergeHours = (lists: readonly (readonly number[])[]) =>
	Array.from({ length: 24 }, (_, hour) => lists.reduce((sum, list) => sum + (list[hour] ?? 0), 0));

/** Adds several days' stat rows together by name (for ranges, stats and insights). */
export function mergeStatTotals(lists: readonly (readonly StatTotal[])[]): StatTotal[] {
	const merged = new Map<string, StatTotal>();
	for (const list of lists) {
		for (const item of list) {
			const existing = merged.get(item.name);
			if (existing) {
				existing.totalSeconds += item.totalSeconds;
				existing.aiLineChanges += item.aiLineChanges;
				existing.humanLineChanges += item.humanLineChanges;
			} else merged.set(item.name, { ...item });
		}
	}
	return [...merged.values()].sort((a, b) => b.totalSeconds - a.totalSeconds || a.name.localeCompare(b.name));
}
