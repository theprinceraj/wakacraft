import { Suspense } from 'react';

import { AuthForm } from '@/components/auth/auth-form';
import { enabledSocialProviders } from '@/lib/auth/auth';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create account' };

export default function SignupPage() {
	return (
		<>
			<h1 className="text-lg font-semibold tracking-tight">Create your account</h1>
			<p className="mb-5 text-xs text-muted-foreground">
				Free, automatic time tracking from the editor plugins you already use.
			</p>
			<Suspense>
				<AuthForm mode="sign-up" socialProviders={enabledSocialProviders} />
			</Suspense>
		</>
	);
}
