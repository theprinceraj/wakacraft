'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { cn } from '@/lib/utils';
import { GithubLoginSchema } from '@/server/github-wrapped/github-wrapped.request.dto';

/**
 * Takes a GitHub username to the wrapped page. Without JavaScript it submits `?u=` to /github-wrapped, which
 * redirects, so it works either way.
 */
export function UsernameForm({
	defaultValue = '',
	error: serverError,
	className,
	autoFocus,
}: {
	defaultValue?: string;
	error?: string;
	className?: string;
	autoFocus?: boolean;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState(serverError);

	return (
		<form
			action="/github-wrapped"
			method="get"
			className={cn('w-full max-w-md', className)}
			onSubmit={(event) => {
				event.preventDefault();
				const parsed = GithubLoginSchema.safeParse(new FormData(event.currentTarget).get('u') ?? '');
				if (!parsed.success) {
					setError(parsed.error.issues[0]?.message);
					return;
				}
				setError(undefined);
				startTransition(() => router.push(`/github-wrapped/${encodeURIComponent(parsed.data)}`));
			}}
		>
			<div
				className={cn(
					'flex h-14 items-center rounded-full bg-card pr-1.5 pl-4 sm:pl-5 shadow-[inset_0_0_0_1px_var(--input)] transition-shadow focus-within:shadow-[inset_0_0_0_2px_var(--ember)]',
					error && 'shadow-[inset_0_0_0_1.5px_var(--destructive)]',
				)}
			>
				<label
					htmlFor="github-username"
					className="sr-only shrink-0 text-sm text-muted-foreground select-none sm:not-sr-only"
				>
					github.com/
				</label>
				<input
					id="github-username"
					name="u"
					defaultValue={defaultValue}
					placeholder="your-username"
					autoComplete="off"
					autoCapitalize="none"
					spellCheck={false}
					autoFocus={autoFocus}
					required
					maxLength={40}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? 'github-username-error' : undefined}
					className="h-full min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60"
				/>
				<button
					type="submit"
					disabled={pending}
					className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary pr-4 pl-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70"
				>
					{pending ? 'Wrapping…' : 'Wrap it'}
					<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
				</button>
			</div>
			{error ? (
				<p id="github-username-error" className="mt-2 pl-5 text-sm text-destructive">
					{error}
				</p>
			) : null}
		</form>
	);
}
