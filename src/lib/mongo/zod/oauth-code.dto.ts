/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const OAuthCodeZodSchema = z.object({
	id: z.string(),
	codeHash: z.string(),
	appId: z.string(),
	userId: z.string(),
	scopes: z.array(z.string()),
	redirectUri: z.string(),
	codeChallenge: z.string().nullish(),
	codeChallengeMethod: z.enum(['S256', 'plain']).nullish(),
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
export const PartialOAuthCodeZodSchema = OAuthCodeZodSchema.partial();

export type IOAuthCodeZodSchema = TypeOf<typeof OAuthCodeZodSchema>;
export type IOAuthCodeZodSchemaInput = Omit<z.input<typeof OAuthCodeZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof OAuthCodeZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialOAuthCodeZodSchema = TypeOf<typeof PartialOAuthCodeZodSchema>;
