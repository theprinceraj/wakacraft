/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const OAuthTokenZodSchema = z.object({
	id: z.string(),
	appId: z.string(),
	userId: z.string(),
	scopes: z.array(z.string()),
	accessTokenHash: z.string(),
	refreshTokenHash: z.string(),
	accessExpiresAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
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
export const PartialOAuthTokenZodSchema = OAuthTokenZodSchema.partial();

export type IOAuthTokenZodSchema = TypeOf<typeof OAuthTokenZodSchema>;
export type IOAuthTokenZodSchemaInput = Omit<z.input<typeof OAuthTokenZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof OAuthTokenZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialOAuthTokenZodSchema = TypeOf<typeof PartialOAuthTokenZodSchema>;
