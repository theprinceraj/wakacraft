'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth/auth-client';

const PROVIDER_LABEL = { github: 'GitHub', google: 'Google' } as const;
type Provider = keyof typeof PROVIDER_LABEL;

/** Only relative paths are honoured as a post-login destination, so `?next=` can't redirect off-site. */
const safeNext = (next: string | null) =>
	next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

/** Sign-in and sign-up are the same click with OAuth: new accounts are created on first sign-in. */
export function AuthForm({ socialProviders }: { socialProviders: Provider[] }) {
	const next = safeNext(useSearchParams().get('next'));
	const [pending, setPending] = useState<Provider | null>(null);
	const [error, setError] = useState<string | null>(null);

	if (!socialProviders.length) {
		return (
			<p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
				No sign-in provider is configured. Set <code className="tabular">GITHUB_CLIENT_ID</code> and{' '}
				<code className="tabular">GITHUB_CLIENT_SECRET</code> (see <code className="tabular">.env.example</code>).
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			{socialProviders.map((provider) => (
				<Button
					key={provider}
					variant={provider === 'github' ? 'default' : 'outline'}
					className="w-full"
					disabled={pending !== null}
					onClick={async () => {
						setPending(provider);
						setError(null);
						const { error: signInError } = await signIn.social({
							provider,
							callbackURL: next,
							// First sign-in goes through /welcome once, to pick up the browser's timezone.
							newUserCallbackURL: `/welcome?next=${encodeURIComponent(next)}`,
						});
						if (signInError) {
							setPending(null);
							setError(signInError.message ?? 'Sign-in failed');
						}
					}}
				>
					{pending === provider ? 'Redirecting…' : `Continue with ${PROVIDER_LABEL[provider]}`}
				</Button>
			))}
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
