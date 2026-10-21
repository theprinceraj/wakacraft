/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const UserProfileZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	username: z.string().min(2).max(39).nullish(),
	timezone: z.string().default('UTC'),
	timeout: z.number().gte(1).lte(120).default(15),
	writesOnly: z.boolean().default(false),
	weekStartDay: z.number().gte(0).lte(6).default(1),
	bio: z.string().max(500).nullish(),
	website: z.string().nullish(),
	githubUsername: z.string().nullish(),
	twitterUsername: z.string().nullish(),
	linkedinUsername: z.string().nullish(),
	city: z
		.object({ name: z.string(), state: z.string().nullish(), countryCode: z.string().min(2).max(2).nullish() })
		.nullish(),
	isHireable: z.boolean().default(false),
	isEmailPublic: z.boolean().default(false),
	isPhotoPublic: z.boolean().default(true),
	loggedTimePublic: z.boolean().default(false),
	languagesUsedPublic: z.boolean().default(false),
	editorsUsedPublic: z.boolean().default(false),
	categoriesUsedPublic: z.boolean().default(false),
	osUsedPublic: z.boolean().default(false),
	lastHeartbeatAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' })
		.nullish(),
	lastPlugin: z.string().nullish(),
	lastProject: z.string().nullish(),
	lastBranch: z.string().nullish(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialUserProfileZodSchema = UserProfileZodSchema.partial();

export type IUserProfileZodSchema = TypeOf<typeof UserProfileZodSchema>;
export type IUserProfileZodSchemaInput = Omit<z.input<typeof UserProfileZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof UserProfileZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialUserProfileZodSchema = TypeOf<typeof PartialUserProfileZodSchema>;
