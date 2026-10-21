/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const ApiKeyZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string().max(100),
	keyHash: z.string(),
	keyPreview: z.string(),
	lastUsedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' })
		.nullish(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialApiKeyZodSchema = ApiKeyZodSchema.partial();

export type IApiKeyZodSchema = TypeOf<typeof ApiKeyZodSchema>;
export type IApiKeyZodSchemaInput = Omit<z.input<typeof ApiKeyZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof ApiKeyZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialApiKeyZodSchema = TypeOf<typeof PartialApiKeyZodSchema>;
