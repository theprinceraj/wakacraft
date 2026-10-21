import { z } from 'zod';

import { GoalZodSchema } from '@/lib/mongo/zod';
import { GoalStatusesList } from '@/lib/util/Goals';

const status = z.enum(GoalStatusesList);

/** WakaTime's goal shape (`GET users/:user/goals/:goal`), plus wakacraft's `streak`. */
export const GoalResponseSchema = z.object({
	id: GoalZodSchema.shape.id,
	title: z.string(),
	custom_title: z.string().nullable(),
	delta: GoalZodSchema.shape.delta,
	seconds: z.number(),
	type: z.literal('coding'),
	status,
	status_percent_calculated: z.number(),
	streak: z.number(),
	is_inverse: z.boolean(),
	is_enabled: z.boolean(),
	is_snoozed: z.boolean(),
	snooze_until: z.iso.datetime().nullable(),
	ignore_days: z.array(z.string()),
	ignore_zero_days: z.boolean(),
	projects: z.array(z.string()),
	languages: z.array(z.string()),
	editors: z.array(z.string()),
	categories: z.array(z.string()),
	chart_data: z.array(
		z.object({
			range: z.object({ start: z.iso.date(), end: z.iso.date(), text: z.string() }),
			actual_seconds: z.number(),
			actual_seconds_text: z.string(),
			goal_seconds: z.number(),
			goal_seconds_text: z.string(),
			range_status: status,
			range_status_reason: z.string(),
		}),
	),
	created_at: z.iso.datetime(),
	modified_at: z.iso.datetime(),
});

export type GoalResponse = z.infer<typeof GoalResponseSchema>;
