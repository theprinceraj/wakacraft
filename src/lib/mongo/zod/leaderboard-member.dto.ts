/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const LeaderboardMemberZodSchema = z.object({
	id: z.string(),
	leaderboardId: z.string(),
	userId: z.string(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialLeaderboardMemberZodSchema = LeaderboardMemberZodSchema.partial();

export type ILeaderboardMemberZodSchema = TypeOf<typeof LeaderboardMemberZodSchema>;
export type ILeaderboardMemberZodSchemaInput = Omit<
	z.input<typeof LeaderboardMemberZodSchema>,
	'createdAt' | 'updatedAt'
> &
	Partial<Pick<z.input<typeof LeaderboardMemberZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialLeaderboardMemberZodSchema = TypeOf<typeof PartialLeaderboardMemberZodSchema>;
