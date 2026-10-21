import { Suspense } from 'react';

import { AuthForm } from '@/components/auth/auth-form';
import { enabledSocialProviders } from '@/lib/auth/auth';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
	return (
		<>
			<h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
			<p className="mb-5 text-xs text-muted-foreground">
				Welcome back. Your editors kept tracking while you were away.
			</p>
			<Suspense>
				<AuthForm mode="sign-in" socialProviders={enabledSocialProviders} />
			</Suspense>
		</>
	);
}
