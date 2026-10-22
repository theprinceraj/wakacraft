import { auth } from '@/lib/auth/auth';
import { userProfileService } from '@/server/user/user-profile.service';

/**
 * Creates a user directly, as a first OAuth sign-in would. Sign-in is OAuth-only, so tests can't register through a
 * form; the `{ body }` argument keeps the shape the tests were written with (`password` is ignored).
 */
export async function signUpTestUser({ body }: { body: { email: string; name: string; password?: string } }) {
	const context = await auth.$context;
	const user = await context.internalAdapter.createUser(
		{ email: body.email, name: body.name, emailVerified: true },
		{ method: 'admin' },
	);
	await userProfileService.ensureProfile(user.id);
	return { user };
}
