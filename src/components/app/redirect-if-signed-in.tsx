import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';

/** Render inside `<Suspense>`: sends signed-in visitors of public pages to the dashboard. */
export async function RedirectIfSignedIn() {
	if (await getSession()) redirect('/dashboard');
	return null;
}
