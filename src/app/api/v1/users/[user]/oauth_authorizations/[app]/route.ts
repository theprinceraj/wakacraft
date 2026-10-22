import { requireSelf, route } from '@/lib/http/route';
import { AuthorizationParamsSchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';

/** Revokes every token you granted the app. */
export const DELETE = route({ auth: 'session', params: AuthorizationParamsSchema }, async ({ caller, params }) => {
	await oauthService.revokeAuthorization(await requireSelf(params.user, caller), params.app);
	return { data: { result: 'revoked' } };
});
