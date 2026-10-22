import { z } from 'zod';

import { ExternalDurationZodSchema } from '@/lib/mongo/zod';

const optionalText = (max: number) => z.string().trim().max(max).nullish();
const MAX_SPAN_SECONDS = 7 * 86_400;

/** One external duration in WakaTime's wire format, transformed into the stored camelCase shape. */
export const ExternalDurationRequestSchema = z
	.object({
		external_id: z.string().trim().min(1).max(256),
		entity: z.string().trim().min(1).max(2048),
		type: ExternalDurationZodSchema.shape.type,
		category: ExternalDurationZodSchema.shape.category,
		start_time: z.number().positive(),
		end_time: z.number().positive(),
		project: optionalText(512),
		branch: optionalText(512),
		language: optionalText(128),
		meta: optionalText(2048),
		provider: optionalText(128),
	})
	.refine((duration) => duration.end_time > duration.start_time, {
		message: 'end_time must be after start_time',
		path: ['end_time'],
	})
	.refine((duration) => duration.end_time - duration.start_time <= MAX_SPAN_SECONDS, {
		message: 'An external duration can span at most 7 days',
		path: ['end_time'],
	})
	.refine((duration) => duration.start_time <= Date.now() / 1000 + 86_400, {
		message: 'start_time is in the future',
		path: ['start_time'],
	})
	.transform((duration) => ({
		externalId: duration.external_id,
		entity: duration.entity,
		type: duration.type,
		category: duration.category,
		startTime: duration.start_time,
		endTime: duration.end_time,
		project: duration.project || undefined,
		branch: duration.branch || undefined,
		language: duration.language || undefined,
		meta: duration.meta || undefined,
		provider: duration.provider || undefined,
	}));

export type ExternalDurationInput = z.output<typeof ExternalDurationRequestSchema>;

export const BulkExternalDurationsSchema = z.array(z.unknown()).min(1).max(1000);

export const ExternalDurationsQuerySchema = z.object({
	date: z.iso.date(),
	project: z.string().min(1).optional(),
	branches: z
		.string()
		.transform((value) =>
			value
				.split(',')
				.map((branch) => branch.trim())
				.filter(Boolean),
		)
		.optional(),
	timezone: z.string().optional(),
});

export const DeleteExternalDurationsSchema = z.object({
	date: z.iso.date(),
	ids: z.array(ExternalDurationZodSchema.shape.id).min(1).max(1000),
});
