import { auth } from '@/lib/auth/auth';
import { apiKeyService } from '@/server/api-key/api-key.service';

export interface Caller {
	userId: string;
	via: 'session' | 'api_key';
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

/** An explicit credential (API key) wins over the session cookie; a malformed or unknown key is a 401. */
export async function resolveCaller(request: Request): Promise<Caller | null> {
	const apiKey = extractApiKey(request);
	if (apiKey === null) return null;

	if (apiKey) {
		const owner = await apiKeyService.resolve(apiKey);
		return owner ? { userId: owner.userId, via: 'api_key' } : null;
	}

	const session = await auth.api.getSession({ headers: request.headers });
	return session ? { userId: session.user.id, via: 'session' } : null;
}
