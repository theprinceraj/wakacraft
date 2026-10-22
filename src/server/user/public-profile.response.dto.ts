import { z } from 'zod';

import { UserResponseSchema } from './user.response.dto';

/** What anyone may see about a user: the public subset of `UserResponse`, with private fields nulled. */
export const PublicUserResponseSchema = UserResponseSchema.pick({
	id: true,
	username: true,
	display_name: true,
	full_name: true,
	photo: true,
	bio: true,
	website: true,
	github_username: true,
	twitter_username: true,
	linkedin_username: true,
	city: true,
	is_hireable: true,
	logged_time_public: true,
	languages_used_public: true,
	editors_used_public: true,
	categories_used_public: true,
	os_used_public: true,
	created_at: true,
}).extend({
	email: z.string().nullable(),
});

export type PublicUserResponse = z.infer<typeof PublicUserResponseSchema>;
