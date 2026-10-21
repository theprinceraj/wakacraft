'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp } from '@/lib/auth/auth-client';

const SignInSchema = z.object({
	email: z.email('Enter a valid email'),
	password: z.string().min(1, 'Enter your password'),
});

const SignUpSchema = SignInSchema.extend({
	name: z.string().trim().min(1, 'Enter your name').max(80),
	password: z.string().min(8, 'Use at least 8 characters'),
});

type Mode = 'sign-in' | 'sign-up';

/** Only relative paths are honoured as a post-login destination, so `?next=` can't redirect off-site. */
const safeNext = (next: string | null) =>
	next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

export function AuthForm({ mode, socialProviders }: { mode: Mode; socialProviders: ('github' | 'google')[] }) {
	const router = useRouter();
	const next = safeNext(useSearchParams().get('next'));
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [pending, setPending] = useState(false);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = Object.fromEntries(new FormData(event.currentTarget));
		const parsed = (mode === 'sign-up' ? SignUpSchema : SignInSchema).safeParse(form);
		if (!parsed.success) {
			setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
			return;
		}

		setErrors({});
		setPending(true);
		const { error } =
			mode === 'sign-up'
				? await signUp.email({
						...(parsed.data as z.infer<typeof SignUpSchema>),
						callbackURL: next,
					})
				: await signIn.email({ ...parsed.data, callbackURL: next });
		setPending(false);

		if (error) {
			setErrors({ form: error.message ?? 'Something went wrong' });
			return;
		}

		if (mode === 'sign-up') {
			// Default the profile to the browser's timezone so "today" means the user's today from the first heartbeat.
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			await fetch('/api/v1/users/current', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ timezone }),
			}).catch(() => {});
		}
		router.push(next);
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-5">
			{socialProviders.length ? (
				<>
					<div className="grid gap-2">
						{socialProviders.map((provider) => (
							<Button
								key={provider}
								variant="outline"
								className="w-full"
								onClick={() => signIn.social({ provider, callbackURL: next })}
							>
								Continue with {provider === 'github' ? 'GitHub' : 'Google'}
							</Button>
						))}
					</div>
					<div className="flex items-center gap-3 text-[11px] text-muted-foreground">
						<span className="h-px flex-1 bg-border" />
						or with email
						<span className="h-px flex-1 bg-border" />
					</div>
				</>
			) : null}

			<form className="flex flex-col gap-3.5" onSubmit={onSubmit} noValidate>
				{mode === 'sign-up' ? <Field label="Name" name="name" autoComplete="name" error={errors.name} /> : null}
				<Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
				<Field
					label="Password"
					name="password"
					type="password"
					autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
					error={errors.password}
				/>
				{errors.form ? <p className="text-xs text-destructive">{errors.form}</p> : null}
				<Button type="submit" disabled={pending} className="mt-1 w-full">
					{pending ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
				</Button>
			</form>

			<p className="text-center text-xs text-muted-foreground">
				{mode === 'sign-up' ? 'Already have an account? ' : 'New to wakacraft? '}
				<Link
					href={`${mode === 'sign-up' ? '/login' : '/signup'}${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
					className="text-ember hover:underline"
				>
					{mode === 'sign-up' ? 'Sign in' : 'Create an account'}
				</Link>
			</p>
		</div>
	);
}

function Field({
	label,
	name,
	error,
	...props
}: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={name} className="text-xs">
				{label}
			</Label>
			<Input id={name} name={name} aria-invalid={Boolean(error)} {...props} />
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
