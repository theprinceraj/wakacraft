import { z } from 'zod';

import { UserProfileZodSchema, type IUserProfileZodSchema } from '@/lib/mongo/zod';
import { KEYSTROKE_TIMEOUT_MINUTES } from '@/lib/util/Constants';

/** WakaTime's `GET users/current` shape (the subset that maps onto wakacraft data), plus wakacraft settings. */
export const UserResponseSchema = z.object({
	id: z.string(),
	username: z.string().nullable(),
	display_name: z.string(),
	full_name: z.string().nullable(),
	email: z.string().nullable(),
	is_email_confirmed: z.boolean(),
	photo: z.string().nullable(),
	bio: z.string().nullable(),
	website: z.string().nullable(),
	github_username: z.string().nullable(),
	twitter_username: z.string().nullable(),
	linkedin_username: z.string().nullable(),
	city: UserProfileZodSchema.shape.city.unwrap().nullable(),
	timezone: z.string(),
	timeout: z.number(),
	writes_only: z.boolean(),
	week_start_day: z.number(),
	is_hireable: z.boolean(),
	is_email_public: z.boolean(),
	is_photo_public: z.boolean(),
	logged_time_public: z.boolean(),
	languages_used_public: z.boolean(),
	editors_used_public: z.boolean(),
	categories_used_public: z.boolean(),
	os_used_public: z.boolean(),
	has_premium_features: z.boolean(),
	plan: z.string(),
	last_heartbeat_at: z.iso.datetime().nullable(),
	last_plugin: z.string().nullable(),
	last_plugin_name: z.string().nullable(),
	last_project: z.string().nullable(),
	last_branch: z.string().nullable(),
	created_at: z.iso.datetime(),
	modified_at: z.iso.datetime(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export interface AuthUserFields {
	name: string | null;
	email: string | null;
	emailVerified: boolean;
	image: string | null;
}

export const toUserResponse = (profile: IUserProfileZodSchema, authUser: AuthUserFields): UserResponse => ({
	id: profile.userId,
	username: profile.username ?? null,
	display_name: profile.username ? `@${profile.username}` : (authUser.name ?? 'Anonymous'),
	full_name: authUser.name,
	email: authUser.email,
	is_email_confirmed: authUser.emailVerified,
	photo: authUser.image,
	bio: profile.bio ?? null,
	website: profile.website ?? null,
	github_username: profile.githubUsername ?? null,
	twitter_username: profile.twitterUsername ?? null,
	linkedin_username: profile.linkedinUsername ?? null,
	city: profile.city ?? null,
	timezone: profile.timezone,
	timeout: KEYSTROKE_TIMEOUT_MINUTES,
	writes_only: profile.writesOnly,
	week_start_day: profile.weekStartDay,
	is_hireable: profile.isHireable,
	is_email_public: profile.isEmailPublic,
	is_photo_public: profile.isPhotoPublic,
	logged_time_public: profile.loggedTimePublic,
	languages_used_public: profile.languagesUsedPublic,
	editors_used_public: profile.editorsUsedPublic,
	categories_used_public: profile.categoriesUsedPublic,
	os_used_public: profile.osUsedPublic,
	has_premium_features: true,
	plan: 'free',
	last_heartbeat_at: profile.lastHeartbeatAt?.toISOString() ?? null,
	last_plugin: profile.lastPlugin ?? null,
	last_plugin_name: profile.lastPlugin ?? null,
	last_project: profile.lastProject ?? null,
	last_branch: profile.lastBranch ?? null,
	created_at: profile.createdAt.toISOString(),
	modified_at: profile.updatedAt.toISOString(),
});
