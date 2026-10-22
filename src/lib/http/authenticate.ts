import { auth } from '@/lib/auth/auth';
import { ACCESS_TOKEN_PREFIX, type OAuthScope } from '@/lib/util/OAuth';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { oauthService } from '@/server/oauth/oauth.service';

export interface Caller {
	userId: string;
	via: 'session' | 'api_key' | 'oauth';
	/** Granted scopes, for OAuth callers only; sessions and API keys have full access. */
	scopes?: OAuthScope[];
}

/** An OAuth access token, sent as `Authorization: Bearer waka_tok_…` or `?access_token=`. */
export function extractAccessToken(request: Request): string | undefined {
	const header = request.headers.get('authorization');
	if (header) {
		const [scheme, value = ''] = header.trim().split(/\s+/, 2);
		return scheme.toLowerCase() === 'bearer' && value.startsWith(ACCESS_TOKEN_PREFIX) ? value : undefined;
	}
	const fromQuery = new URL(request.url).searchParams.get('access_token');
	return fromQuery?.startsWith(ACCESS_TOKEN_PREFIX) ? fromQuery : undefined;
}

const API_KEY_PATTERN = /^waka_[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * Pulls a plugin API key out of the request the ways wakatime-cli and WakaTime-compatible clients send it:
 * `Authorization: Basic base64(key)` (optionally `key:` or `user:key`), `Authorization: Bearer key`, or `?api_key=`.
 * Returns `undefined` when the request carries no key at all, `null` when it carries something that isn't one.
 */
export function extractApiKey(request: Request): string | null | undefined {
	const header = request.headers.get('authorization');

	if (header) {
		const [scheme, value = ''] = header.trim().split(/\s+/, 2);
		let candidate = value;

		if (scheme.toLowerCase() === 'basic') {
			try {
				candidate = Buffer.from(value, 'base64').toString('utf8');
			} catch {
				return null;
			}
			candidate = candidate.split(':').find((part) => API_KEY_PATTERN.test(part.trim())) ?? candidate;
		} else if (scheme.toLowerCase() !== 'bearer') return null;

		candidate = candidate.trim();
		return API_KEY_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
	}

	const fromQuery = new URL(request.url).searchParams.get('api_key');
	if (fromQuery !== null) return API_KEY_PATTERN.test(fromQuery.trim()) ? fromQuery.trim().toLowerCase() : null;

	return undefined;
}

/** An explicit credential (OAuth token or API key) wins over the session cookie; an unknown one is a 401. */
export async function resolveCaller(request: Request): Promise<Caller | null> {
	const accessToken = extractAccessToken(request);
	if (accessToken) {
		const grant = await oauthService.resolveAccessToken(accessToken);
		return grant ? { userId: grant.userId, via: 'oauth', scopes: grant.scopes } : null;
	}

	const apiKey = extractApiKey(request);
	if (apiKey === null) return null;

	if (apiKey) {
		const owner = await apiKeyService.resolve(apiKey);
		return owner ? { userId: owner.userId, via: 'api_key' } : null;
	}

	const session = await auth.api.getSession({ headers: request.headers });
	return session ? { userId: session.user.id, via: 'session' } : null;
}
