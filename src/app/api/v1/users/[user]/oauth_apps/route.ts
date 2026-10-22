import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateOAuthAppSchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';

/** wakacraft extension: OAuth apps you registered as a developer. */
export const GET = route({ auth: 'session', params: UserParamSchema }, async ({ caller, params }) =>
	oauthService.listApps(await requireSelf(params.user, caller)),
);

/** The response carries `client_secret`, shown only this once. */
export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: CreateOAuthAppSchema, status: 201 },
	async ({ caller, params, body }) => oauthService.createApp(await requireSelf(params.user, caller), body),
);
