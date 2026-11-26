import { Check } from 'lucide-react';
import { Suspense } from 'react';

import { AuthForm } from '@/components/auth/auth-form';
import { Heading } from '@/components/landing/site';
import { enabledSocialProviders } from '@/lib/auth/auth';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign in' };

const PROMISES = ['Every feature is free', 'Import your WakaTime history', 'Open source, AGPL-3.0'];

export default function LoginPage() {
	return (
		<>
			<Heading as="h1" className="text-4xl leading-[1.05] sm:text-5xl">
				Sign in to wakacraft
			</Heading>
			<p className="mt-4 leading-relaxed text-muted-foreground">
				New here? Signing in creates your account. There’s no password to remember.
			</p>
			<div className="mt-8">
				<Suspense>
					<AuthForm socialProviders={enabledSocialProviders} />
				</Suspense>
			</div>
			<ul className="mt-10 divide-y border-y">
				{PROMISES.map((promise) => (
					<li key={promise} className="flex items-center gap-3 py-3.5 text-sm">
						<Check className="size-4 shrink-0 text-ember" strokeWidth={2.5} />
						{promise}
					</li>
				))}
			</ul>
		</>
	);
}
