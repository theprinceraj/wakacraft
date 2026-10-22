import { requireSelf, route } from '@/lib/http/route';
import { OAuthAppParamsSchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';

/** Issues a new client secret (returned once); the old one stops working. */
export const POST = route({ auth: 'session', params: OAuthAppParamsSchema }, async ({ caller, params }) =>
	oauthService.rotateSecret(await requireSelf(params.user, caller), params.app),
);
