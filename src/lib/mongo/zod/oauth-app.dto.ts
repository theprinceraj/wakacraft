/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const OAuthAppZodSchema = z.object({
	id: z.string(),
	ownerId: z.string(),
	name: z.string().min(1).max(80),
	description: z.string().max(500).nullish(),
	website: z.string().nullish(),
	redirectUris: z.array(z.string()),
	clientId: z.string(),
	clientSecretHash: z.string(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialOAuthAppZodSchema = OAuthAppZodSchema.partial();

export type IOAuthAppZodSchema = TypeOf<typeof OAuthAppZodSchema>;
export type IOAuthAppZodSchemaInput = Omit<z.input<typeof OAuthAppZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof OAuthAppZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialOAuthAppZodSchema = TypeOf<typeof PartialOAuthAppZodSchema>;
