/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const RateLimitZodSchema = z.object({
	id: z.string(),
	key: z.string(),
	count: z.number().default(0),
	expiresAt: z
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
export const PartialRateLimitZodSchema = RateLimitZodSchema.partial();

export type IRateLimitZodSchema = TypeOf<typeof RateLimitZodSchema>;
export type IRateLimitZodSchemaInput = Omit<z.input<typeof RateLimitZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof RateLimitZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialRateLimitZodSchema = TypeOf<typeof PartialRateLimitZodSchema>;
