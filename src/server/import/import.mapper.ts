/**
 * Converts heartbeats from a WakaTime (or wakacraft) heartbeats export into ingestion wire format. Exports reference
 * user agents and machines by id; the export's `user_agents` / `machines` lists (when present) resolve them back to
 * the strings ingestion parses editor/OS from.
 */

import { z } from 'zod';

export interface ImportLookups {
	userAgents: Map<string, string>;
	machines: Map<string, string>;
}

type Loose = Record<string, unknown>;

/** Ingestion's limits on a heartbeat's dependency list (`heartbeat.request.dto.ts`). */
const MAX_DEPENDENCIES = 500;
const MAX_DEPENDENCY_LENGTH = 256;

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);
/** WakaTime ids are UUIDs; wakacraft's own export ids are snowflakes, which mean nothing outside their instance. */
const wakatimeId = (value: unknown) => (z.guid().safeParse(value).success ? (value as string) : undefined);
const integer = (value: unknown) =>
	typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : undefined;

export function buildLookups(userAgents: unknown, machines: unknown): ImportLookups {
	const entries = (list: unknown, valueOf: (item: Loose) => string | undefined) =>
		new Map(
			(Array.isArray(list) ? list : [])
				.filter((item): item is Loose => typeof item === 'object' && item !== null && typeof item.id === 'string')
				.flatMap((item) => {
					const value = valueOf(item);
					return value ? [[item.id as string, value] as const] : [];
				}),
		);

	const machineNames = entries(machines, (item) => text(item.value) ?? text(item.name));
	// wakacraft exports reference machines by name rather than id, so names resolve to themselves too.
	for (const name of [...machineNames.values()]) machineNames.set(name, name);

	return { userAgents: entries(userAgents, (item) => text(item.value)), machines: machineNames };
}

export function toWireHeartbeat(raw: unknown, lookups: ImportLookups): unknown {
	if (typeof raw !== 'object' || raw === null) return raw;
	const heartbeat = raw as Loose;
	const userAgentId = text(heartbeat.user_agent_id);
	const machineId = text(heartbeat.machine_name_id);

	return {
		source_id: wakatimeId(heartbeat.id),
		entity: heartbeat.entity,
		type: heartbeat.type,
		// WakaTime exports and its heartbeats API title-case categories ("AI Coding"); ingestion takes wakatime-cli's lowercase.
		category: text(heartbeat.category)?.toLowerCase(),
		time: heartbeat.time,
		project: text(heartbeat.project),
		project_root_count: integer(heartbeat.project_root_count),
		branch: text(heartbeat.branch),
		language: text(heartbeat.language),
		// Ingestion caps dependency lists; trim history to fit rather than lose the whole heartbeat.
		dependencies: Array.isArray(heartbeat.dependencies)
			? heartbeat.dependencies
					.filter((dependency) => typeof dependency === 'string' && dependency.length <= MAX_DEPENDENCY_LENGTH)
					.slice(0, MAX_DEPENDENCIES)
			: text(heartbeat.dependencies),
		lines: integer(heartbeat.lines),
		lineno: integer(heartbeat.lineno),
		cursorpos: integer(heartbeat.cursorpos),
		is_write: typeof heartbeat.is_write === 'boolean' ? heartbeat.is_write : undefined,
		ai_line_changes: integer(heartbeat.ai_line_changes),
		human_line_changes: integer(heartbeat.human_line_changes),
		user_agent: text(heartbeat.user_agent) ?? (userAgentId ? lookups.userAgents.get(userAgentId) : undefined),
		// Resolved via the export's machine list. With no list, a wakacraft export's id is already the name, but a
		// WakaTime machine id (a UUID) names nothing, so it's left out for an API import to fill in later.
		machine_name: machineId
			? (lookups.machines.get(machineId) ?? (lookups.machines.size || wakatimeId(machineId) ? undefined : machineId))
			: undefined,
	};
}
