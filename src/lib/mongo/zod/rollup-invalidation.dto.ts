/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const RollupInvalidationZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	date: z.string(),
	generation: z.number().default(0),
	at: z
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
export const PartialRollupInvalidationZodSchema = RollupInvalidationZodSchema.partial();

export type IRollupInvalidationZodSchema = TypeOf<typeof RollupInvalidationZodSchema>;
export type IRollupInvalidationZodSchemaInput = Omit<
	z.input<typeof RollupInvalidationZodSchema>,
	'createdAt' | 'updatedAt'
> &
	Partial<Pick<z.input<typeof RollupInvalidationZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialRollupInvalidationZodSchema = TypeOf<typeof PartialRollupInvalidationZodSchema>;
