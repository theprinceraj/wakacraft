import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { connectMongo } from '@/lib/mongo/connection';

import { auth } from './auth';

/** Once per request, however many components ask. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** For app pages: the signed-in user, or a redirect to sign-in. Also opens the Mongo connection. */
export async function requireSession(nextPath?: string) {
	const [session] = await Promise.all([getSession(), connectMongo()]);
	if (!session) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login');
	return session;
}
