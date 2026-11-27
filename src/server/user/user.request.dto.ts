import { z } from 'zod';

import { UserProfileZodSchema } from '@/lib/mongo/zod';
import { isValidTimezone } from '@/lib/util/Time';

/** The username format: letters, digits and single inner dashes, stored lowercase. */
export const UsernameSchema = z
	.string()
	.regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i, 'Letters, numbers and single dashes only')
	.transform((value) => value.toLowerCase());

/** Names real accounts can't take: the public demo account's, read per request so DEMO_USERNAME changes apply. */
const isReservedUsername = (username: string) =>
	username === 'demo' || username === process.env.DEMO_USERNAME?.trim().toLowerCase();

/**
 * The generated schema carries the model's `.default()`s, which a partial PATCH would fill in for every field it leaves
 * out (resetting all privacy flags whenever one form saves). Strip them so omitted fields stay undefined.
 */
const withoutDefaults = <S extends z.ZodRawShape>(shape: S) =>
	Object.fromEntries(
		Object.entries(shape).map(([key, schema]) => [key, schema instanceof z.ZodDefault ? schema.unwrap() : schema]),
	) as { [K in keyof S]: S[K] extends z.ZodDefault<infer T> ? T : S[K] };

const SettingsFieldsSchema = UserProfileZodSchema.pick({
	username: true,
	writesOnly: true,
	weekStartDay: true,
	bio: true,
	website: true,
	githubUsername: true,
	twitterUsername: true,
	linkedinUsername: true,
	city: true,
	isHireable: true,
	isEmailPublic: true,
	isPhotoPublic: true,
	loggedTimePublic: true,
	languagesUsedPublic: true,
	editorsUsedPublic: true,
	categoriesUsedPublic: true,
	osUsedPublic: true,
});

export const UpdateSettingsSchema = z
	.object(withoutDefaults(SettingsFieldsSchema.shape))
	.extend({
		username: UsernameSchema.refine((value) => !isReservedUsername(value), 'This username is reserved').optional(),
		timezone: z.string().refine(isValidTimezone, 'Unknown timezone').optional(),
		weekStartDay: z.int().min(0).max(6).optional(),
	})
	.partial()
	.strict();

export type UpdateSettingsInput = z.output<typeof UpdateSettingsSchema>;
