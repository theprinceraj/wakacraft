import { requireSelf, route } from '@/lib/http/route';
import { OAuthAppParamsSchema, UpdateOAuthAppSchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';

export const PATCH = route(
	{ auth: 'session', params: OAuthAppParamsSchema, body: UpdateOAuthAppSchema },
	async ({ caller, params, body }) => oauthService.updateApp(await requireSelf(params.user, caller), params.app, body),
);

/** Also revokes every token the app was granted. */
export const DELETE = route({ auth: 'session', params: OAuthAppParamsSchema }, async ({ caller, params }) => {
	await oauthService.deleteApp(await requireSelf(params.user, caller), params.app);
	return { data: { result: 'deleted' } };
});
