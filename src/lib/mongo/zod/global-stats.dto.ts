/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const GlobalStatsZodSchema = z.object({
	id: z.string(),
	range: z.string(),
	start: z.string(),
	end: z.string(),
	users: z.number(),
	totalSeconds: z.number(),
	languages: z.array(z.object({ name: z.string(), totalSeconds: z.number(), users: z.number() })),
	editors: z.array(z.object({ name: z.string(), totalSeconds: z.number(), users: z.number() })),
	categories: z.array(z.object({ name: z.string(), totalSeconds: z.number(), users: z.number() })),
	operatingSystems: z.array(z.object({ name: z.string(), totalSeconds: z.number(), users: z.number() })),
	computedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialGlobalStatsZodSchema = GlobalStatsZodSchema.partial();

export type IGlobalStatsZodSchema = TypeOf<typeof GlobalStatsZodSchema>;
export type IGlobalStatsZodSchemaInput = Omit<z.input<typeof GlobalStatsZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof GlobalStatsZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialGlobalStatsZodSchema = TypeOf<typeof PartialGlobalStatsZodSchema>;
