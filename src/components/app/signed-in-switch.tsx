import { getSession } from '@/lib/auth/session';

/**
 * Render inside `<Suspense>` (with `signedOut` as the fallback, since most visitors of public pages are signed out):
 * shows `signedIn` or `signedOut` depending on the session.
 */
export async function SignedInSwitch({
	signedIn,
	signedOut,
}: {
	signedIn: React.ReactNode;
	signedOut: React.ReactNode;
}) {
	return (await getSession()) ? signedIn : signedOut;
}
