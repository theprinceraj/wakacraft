import { requireSelf, resolveUser, route, UserParamSchema } from '@/lib/http/route';
import { publicProfileService } from '@/server/user/public-profile.service';
import { UpdateSettingsSchema } from '@/server/user/user.request.dto';
import { userService } from '@/server/user/user.service';

/** Yourself: the full account. Anyone else (by username): their public profile. Any OAuth token may read it. */
export const GET = route({ auth: 'optional', scope: 'any', params: UserParamSchema }, async ({ caller, params }) => {
	const target = await resolveUser(params.user, caller);
	if (!target.isSelf) return { data: await publicProfileService.getPublicUser(target.userId) };
	const user = await userService.getCurrentUser(target.userId);
	// An OAuth app sees your email only with the email scope.
	const hideEmail = caller?.via === 'oauth' && !caller.scopes!.includes('email');
	return { data: hideEmail ? { ...user, email: null } : user };
});

export const PATCH = route(
	{ auth: 'session', params: UserParamSchema, body: UpdateSettingsSchema },
	async ({ caller, params, body }) => ({
		data: await userService.updateSettings(await requireSelf(params.user, caller), body),
	}),
);
