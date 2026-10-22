import { auth } from './auth';

/**
 * The GitHub OAuth token from the user's sign-in, if they signed in with GitHub. `scopes` tells whether it can read
 * private repositories (`repo`); sign-in alone only asks for public profile access.
 */
export async function getGithubToken(userId: string): Promise<{ token: string; scopes: string[] } | null> {
	const context = await auth.$context;
	const account = (await context.internalAdapter.findAccounts(userId)).find((item) => item.providerId === 'github');
	if (!account) return null;
	try {
		const { accessToken } = await auth.api.getAccessToken({ body: { accountId: account.id, userId } });
		if (!accessToken) return null;
		return { token: accessToken, scopes: (account.scope ?? '').split(/[\s,]+/).filter(Boolean) };
	} catch {
		return null;
	}
}
