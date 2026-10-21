import 'server-only';

import { headers } from 'next/headers';

/** Public origin of this deployment, for showing plugin setup instructions (`api_url`). */
export async function getBaseUrl(): Promise<string> {
	if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL.replace(/\/$/, '');
	const requestHeaders = await headers();
	const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
	const proto = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
	return `${proto}://${host}`;
}
