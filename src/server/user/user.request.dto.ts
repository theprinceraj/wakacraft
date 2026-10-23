import { z } from 'zod';

import { UserProfileZodSchema } from '@/lib/mongo/zod';
import { isValidTimezone } from '@/lib/util/Time';

export const UpdateSettingsSchema = UserProfileZodSchema.pick({
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
})
	.extend({
		username: z
			.string()
			.regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i, 'Letters, numbers and single dashes only')
			.transform((value) => value.toLowerCase())
			.optional(),
		timezone: z.string().refine(isValidTimezone, 'Unknown timezone').optional(),
		weekStartDay: z.int().min(0).max(6).optional(),
	})
	.partial()
	.strict();

export type UpdateSettingsInput = z.output<typeof UpdateSettingsSchema>;
