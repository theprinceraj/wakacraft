import { mongoExternalDurationService } from '@/lib/mongo/external-duration/external-duration.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';

import type { EngineHeartbeat } from './engine';
import type { IExternalDurationZodSchema } from '@/lib/mongo/zod';

/** Spacing of the synthetic heartbeats an external duration becomes; well under any keystroke timeout. */
export const SYNTHETIC_STEP_SECONDS = 60;

/**
 * Turns an external duration into minute-spaced heartbeats clipped to `[start, end)`. The engine then credits it
 * exactly its length, and where it overlaps editor activity the merged stream counts that time once.
 */
export function externalToHeartbeats(
	external: Pick<
		IExternalDurationZodSchema,
		'startTime' | 'endTime' | 'entity' | 'category' | 'project' | 'branch' | 'language' | 'provider'
	>,
	start: number,
	end: number,
): EngineHeartbeat[] {
	const from = Math.max(external.startTime, start);
	const to = Math.min(external.endTime, end);
	if (to <= from) return [];

	const base = {
		entity: external.entity,
		category: external.category,
		project: external.project,
		branch: external.branch,
		language: external.language,
		editor: external.provider,
	};
	const heartbeats: EngineHeartbeat[] = [];
	for (let time = from; time < to; time += SYNTHETIC_STEP_SECONDS) heartbeats.push({ ...base, time });
	// A closing heartbeat at the end makes the last minute (or less) count too.
	heartbeats.push({ ...base, time: to });
	return heartbeats;
}

/** External durations have no write flag; they always count, also for writes-only users. */
const externalFilter = ({ isWrite: _isWrite, ...rest }: Record<string, unknown>) => rest;

/** Heartbeats plus external durations in `[start, end)`, oldest first: the stream every accounting path reads. */
export async function loadActivity(
	userId: string,
	start: number,
	end: number,
	filter: Record<string, unknown> = {},
	select?: string,
): Promise<EngineHeartbeat[]> {
	const [heartbeats, externals] = await Promise.all([
		mongoHeartbeatService.findInRange(userId, start, end, filter, select) as Promise<EngineHeartbeat[]>,
		mongoExternalDurationService.findOverlapping(userId, start, end, externalFilter(filter)),
	]);
	if (!externals.length) return heartbeats;
	return [...heartbeats, ...externals.flatMap((external) => externalToHeartbeats(external, start, end))].sort(
		(a, b) => a.time - b.time,
	);
}

/** The first activity at or after `time`, so the gap crossing a range's end can be measured. */
export async function firstActivityAtOrAfter(
	userId: string,
	time: number,
	filter: Record<string, unknown> = {},
): Promise<{ time: number } | null> {
	const [heartbeat, [external]] = await Promise.all([
		mongoHeartbeatService.findFirstAtOrAfter(userId, time, filter),
		mongoExternalDurationService.find({ userId, endTime: { $gt: time }, ...externalFilter(filter) }, ['startTime'], {
			sort: { startTime: 1 },
			limit: 1,
		}),
	]);
	const candidates = [heartbeat?.time, external ? Math.max(external.startTime, time) : undefined].filter(
		(value): value is number => value !== undefined,
	);
	return candidates.length ? { time: Math.min(...candidates) } : null;
}
