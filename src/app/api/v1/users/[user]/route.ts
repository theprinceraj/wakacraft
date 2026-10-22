import { requireSelf, resolveUser, route, UserParamSchema } from '@/lib/http/route';
import { publicProfileService } from '@/server/user/public-profile.service';
import { UpdateSettingsSchema } from '@/server/user/user.request.dto';
import { userService } from '@/server/user/user.service';

/** Yourself: the full account. Anyone else (by username): their public profile. */
export const GET = route({ auth: 'optional', params: UserParamSchema }, async ({ caller, params }) => {
	const target = await resolveUser(params.user, caller);
	return {
		data: target.isSelf
			? await userService.getCurrentUser(target.userId)
			: await publicProfileService.getPublicUser(target.userId),
	};
});

export const PATCH = route(
	{ auth: 'session', params: UserParamSchema, body: UpdateSettingsSchema },
	async ({ caller, params, body }) => ({
		data: await userService.updateSettings(await requireSelf(params.user, caller), body),
	}),
);
