import { Suspense } from 'react';

import { AuthForm } from '@/components/auth/auth-form';
import { enabledSocialProviders } from '@/lib/auth/auth';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
	return (
		<>
			<h1 className="text-lg font-semibold tracking-tight">Sign in to wakacraft</h1>
			<p className="mb-5 text-xs text-muted-foreground">
				New here? Signing in creates your account — no password to remember.
			</p>
			<Suspense>
				<AuthForm socialProviders={enabledSocialProviders} />
			</Suspense>
		</>
	);
}
