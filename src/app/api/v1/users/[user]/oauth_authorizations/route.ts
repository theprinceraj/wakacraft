import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { oauthService } from '@/server/oauth/oauth.service';

/** wakacraft extension: apps you authorized to access your account. */
export const GET = route({ auth: 'session', params: UserParamSchema }, async ({ caller, params }) =>
	oauthService.listAuthorizations(await requireSelf(params.user, caller)),
);
