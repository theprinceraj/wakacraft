/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const LeaderboardCacheZodSchema = z.object({
	id: z.string(),
	board: z.string(),
	start: z.string(),
	end: z.string(),
	entries: z.array(
		z.object({
			userId: z.string(),
			totalSeconds: z.number(),
			languages: z.array(z.object({ name: z.string(), totalSeconds: z.number() })),
		}),
	),
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
export const PartialLeaderboardCacheZodSchema = LeaderboardCacheZodSchema.partial();

export type ILeaderboardCacheZodSchema = TypeOf<typeof LeaderboardCacheZodSchema>;
export type ILeaderboardCacheZodSchemaInput = Omit<
	z.input<typeof LeaderboardCacheZodSchema>,
	'createdAt' | 'updatedAt'
> &
	Partial<Pick<z.input<typeof LeaderboardCacheZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialLeaderboardCacheZodSchema = TypeOf<typeof PartialLeaderboardCacheZodSchema>;
