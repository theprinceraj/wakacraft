import { oauthEndpoint, oauthPreflight } from '@/lib/http/oauth-endpoint';
import { TokenRequestSchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';

/** WakaTime's `POST /oauth/token`: exchange an authorization code, or a refresh token, for an access token. */
export const POST = oauthEndpoint(TokenRequestSchema, (input) => oauthService.exchange(input));

export const OPTIONS = oauthPreflight;
