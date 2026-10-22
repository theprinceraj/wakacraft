import { z } from 'zod';

import { HeartbeatZodSchema } from '@/lib/mongo/zod';
import { MAX_HEARTBEAT_AGE_DAYS, MAX_HEARTBEATS_PER_BULK } from '@/lib/util/Constants';

const optionalString = (max: number) => z.string().max(max).nullish();
const optionalInt = z.number().int().nullish();

const time = (maxAgeDays: number | null) => {
	const schema = z
		.number()
		.positive()
		.refine((value) => value <= Date.now() / 1000 + 86_400, 'Heartbeat time is in the future');
	return maxAgeDays === null
		? schema
		: schema.refine(
				(value) => value >= Date.now() / 1000 - maxAgeDays * 86_400,
				`Heartbeats older than ${maxAgeDays} days are not accepted`,
			);
};

/**
 * One heartbeat in WakaTime's snake_case wire format (wakatime-cli `pkg/heartbeat`). Unknown keys are ignored so
 * newer plugins don't break ingestion. `maxAgeDays: null` lifts the age limit for imports of historical data.
 */
const heartbeatFields = (maxAgeDays: number | null) =>
	z.object({
		entity: z.string().trim().min(1).max(2048),
		type: HeartbeatZodSchema.shape.type,
		category: HeartbeatZodSchema.shape.category,
		time: time(maxAgeDays),
		project: optionalString(512),
		project_root_count: optionalInt,
		branch: optionalString(512),
		language: optionalString(128),
		// wakatime-cli sends a JSON array; the HTTP docs describe a comma-separated string. Accept both.
		dependencies: z
			.union([
				z.array(z.string().max(256)).max(500),
				z.string().transform((value) =>
					value
						.split(',')
						.map((dependency) => dependency.trim())
						.filter(Boolean),
				),
			])
			.nullish(),
		lines: optionalInt,
		lineno: optionalInt,
		cursorpos: optionalInt,
		is_write: z.boolean().nullish(),
		ai_line_changes: optionalInt,
		human_line_changes: optionalInt,
		ai_session: optionalString(256),
		ai_input_tokens: optionalInt,
		ai_cached_input_tokens: optionalInt,
		ai_output_tokens: optionalInt,
		ai_prompt_length: optionalInt,
		ai_subscription_plan: optionalString(128),
		user_agent: optionalString(1024),
		/** wakacraft extension: per-heartbeat machine (imports mix machines); live plugins use `X-Machine-Name`. */
		machine_name: optionalString(256),
	});

type HeartbeatFields = z.output<ReturnType<typeof heartbeatFields>> & { source_id?: string | null };

/** Wire fields → the camelCase shape of `HeartbeatZodSchema`. */
const toHeartbeatInput = (heartbeat: HeartbeatFields) => ({
	entity: heartbeat.entity,
	type: heartbeat.type,
	category: heartbeat.category,
	time: heartbeat.time,
	project: heartbeat.project || undefined,
	projectRootCount: heartbeat.project_root_count ?? undefined,
	branch: heartbeat.branch || undefined,
	language: heartbeat.language || undefined,
	dependencies: heartbeat.dependencies?.length ? [...new Set(heartbeat.dependencies)] : undefined,
	lines: heartbeat.lines ?? undefined,
	lineno: heartbeat.lineno ?? undefined,
	cursorpos: heartbeat.cursorpos ?? undefined,
	isWrite: heartbeat.is_write ?? false,
	aiLineChanges: heartbeat.ai_line_changes ?? undefined,
	humanLineChanges: heartbeat.human_line_changes ?? undefined,
	aiSession: heartbeat.ai_session || undefined,
	aiInputTokens: heartbeat.ai_input_tokens ?? undefined,
	aiCachedInputTokens: heartbeat.ai_cached_input_tokens ?? undefined,
	aiOutputTokens: heartbeat.ai_output_tokens ?? undefined,
	aiPromptLength: heartbeat.ai_prompt_length ?? undefined,
	aiSubscriptionPlan: heartbeat.ai_subscription_plan || undefined,
	userAgent: heartbeat.user_agent || undefined,
	machineName: heartbeat.machine_name?.trim() || undefined,
	sourceId: heartbeat.source_id || undefined,
});

export const HeartbeatRequestSchema = heartbeatFields(MAX_HEARTBEAT_AGE_DAYS).transform(toHeartbeatInput);
/**
 * Same wire format without the age limit, for importing history. `source_id` is the heartbeat's id at WakaTime,
 * which is the same in every export and API response, so imports from either source recognise each other.
 */
export const ImportedHeartbeatSchema = heartbeatFields(null)
	.extend({ source_id: z.guid().nullish() })
	.transform(toHeartbeatInput);

export type HeartbeatInput = z.output<typeof HeartbeatRequestSchema>;

/** Bulk bodies are only checked for shape here; each item is validated on its own by the service. */
export const BulkHeartbeatsRequestSchema = z.array(z.unknown()).min(1).max(MAX_HEARTBEATS_PER_BULK);

export const DateQuerySchema = z.object({ date: z.iso.date() });

export const DeleteHeartbeatsRequestSchema = z.object({
	date: z.iso.date(),
	ids: z.array(HeartbeatZodSchema.shape.id).min(1).max(1000),
});
