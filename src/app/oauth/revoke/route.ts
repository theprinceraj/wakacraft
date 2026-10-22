import { oauthEndpoint, oauthPreflight } from '@/lib/http/oauth-endpoint';
import { RevokeRequestSchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';

/** WakaTime's `POST /oauth/revoke`: invalidate a token (or, with `all=true`, every token for that user). */
export const POST = oauthEndpoint(RevokeRequestSchema, async (input) => {
	await oauthService.revoke(input);
});

export const OPTIONS = oauthPreflight;
