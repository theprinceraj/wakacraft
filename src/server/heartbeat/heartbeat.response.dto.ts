import { z } from 'zod';

import { HeartbeatZodSchema, type IHeartbeatZodSchema } from '@/lib/mongo/zod';

/** What `POST heartbeats(.bulk)` echoes back per accepted heartbeat. */
export const HeartbeatCreatedSchema = HeartbeatZodSchema.pick({ id: true, entity: true, type: true, time: true });

/** A stored heartbeat in WakaTime's snake_case shape, as returned by `GET heartbeats`. */
export const HeartbeatResponseSchema = z.object({
	id: HeartbeatZodSchema.shape.id,
	entity: HeartbeatZodSchema.shape.entity,
	type: HeartbeatZodSchema.shape.type,
	category: z.string(),
	time: HeartbeatZodSchema.shape.time,
	project: z.string().nullable(),
	project_root_count: z.number().nullable(),
	branch: z.string().nullable(),
	language: z.string().nullable(),
	dependencies: z.array(z.string()),
	lines: z.number().nullable(),
	lineno: z.number().nullable(),
	cursorpos: z.number().nullable(),
	is_write: z.boolean(),
	ai_line_changes: z.number().nullable(),
	human_line_changes: z.number().nullable(),
	user_agent_id: z.string().nullable(),
	machine_name_id: z.string().nullable(),
	created_at: z.iso.datetime(),
});

export type HeartbeatResponse = z.infer<typeof HeartbeatResponseSchema>;

export const toHeartbeatResponse = (heartbeat: IHeartbeatZodSchema): HeartbeatResponse => ({
	id: heartbeat.id,
	entity: heartbeat.entity,
	type: heartbeat.type,
	category: heartbeat.category,
	time: heartbeat.time,
	project: heartbeat.project ?? null,
	project_root_count: heartbeat.projectRootCount ?? null,
	branch: heartbeat.branch ?? null,
	language: heartbeat.language ?? null,
	dependencies: heartbeat.dependencies ?? [],
	lines: heartbeat.lines ?? null,
	lineno: heartbeat.lineno ?? null,
	cursorpos: heartbeat.cursorpos ?? null,
	is_write: heartbeat.isWrite,
	ai_line_changes: heartbeat.aiLineChanges ?? null,
	human_line_changes: heartbeat.humanLineChanges ?? null,
	user_agent_id: heartbeat.userAgentId ?? null,
	machine_name_id: heartbeat.machine ?? null,
	created_at: new Date(heartbeat.createdAt).toISOString(),
});
