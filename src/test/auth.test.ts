import { describe, expect, it } from 'vitest';

import { auth, enabledSocialProviders } from '@/lib/auth/auth';

describe('auth', () => {
	it('has no email/password sign-up or sign-in (OAuth only, so no email service is needed)', async () => {
		await expect(
			auth.api.signUpEmail({ body: { email: 'nope@wakacraft.test', password: 'correct-horse-battery', name: 'Nope' } }),
		).rejects.toThrow();
		await expect(
			auth.api.signInEmail({ body: { email: 'nope@wakacraft.test', password: 'correct-horse-battery' } }),
		).rejects.toThrow();
	});

	it('only offers configured OAuth providers', () => {
		for (const provider of enabledSocialProviders) expect(['github', 'google']).toContain(provider);
	});
});
