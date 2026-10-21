/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const DailySummaryZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	date: z.string(),
	timezone: z.string(),
	timeout: z.number(),
	writesOnly: z.boolean(),
	totalSeconds: z.number(),
	aiLineChanges: z.number().default(0),
	humanLineChanges: z.number().default(0),
	aiInputTokens: z.number().default(0),
	aiCachedInputTokens: z.number().default(0),
	aiOutputTokens: z.number().default(0),
	aiSessions: z.number().default(0),
	projects: z.array(
		z.object({
			name: z.string(),
			totalSeconds: z.number(),
			aiLineChanges: z.number().default(0),
			humanLineChanges: z.number().default(0),
		}),
	),
	languages: z.array(
		z.object({
			name: z.string(),
			totalSeconds: z.number(),
			aiLineChanges: z.number().default(0),
			humanLineChanges: z.number().default(0),
		}),
	),
	editors: z.array(
		z.object({
			name: z.string(),
			totalSeconds: z.number(),
			aiLineChanges: z.number().default(0),
			humanLineChanges: z.number().default(0),
		}),
	),
	operatingSystems: z.array(
		z.object({
			name: z.string(),
			totalSeconds: z.number(),
			aiLineChanges: z.number().default(0),
			humanLineChanges: z.number().default(0),
		}),
	),
	categories: z.array(
		z.object({
			name: z.string(),
			totalSeconds: z.number(),
			aiLineChanges: z.number().default(0),
			humanLineChanges: z.number().default(0),
		}),
	),
	machines: z.array(
		z.object({
			name: z.string(),
			totalSeconds: z.number(),
			aiLineChanges: z.number().default(0),
			humanLineChanges: z.number().default(0),
		}),
	),
	dependencies: z.array(
		z.object({
			name: z.string(),
			totalSeconds: z.number(),
			aiLineChanges: z.number().default(0),
			humanLineChanges: z.number().default(0),
		}),
	),
	hours: z.array(z.number()).optional(),
	version: z.number().nullish(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialDailySummaryZodSchema = DailySummaryZodSchema.partial();

export type IDailySummaryZodSchema = TypeOf<typeof DailySummaryZodSchema>;
export type IDailySummaryZodSchemaInput = Omit<z.input<typeof DailySummaryZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof DailySummaryZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialDailySummaryZodSchema = TypeOf<typeof PartialDailySummaryZodSchema>;
