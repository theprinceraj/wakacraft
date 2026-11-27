'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="landing flex min-h-full flex-1 flex-col">
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
				<p className="text-sm text-muted-foreground">Something went wrong</p>
				<h1 className="font-semibold tracking-[-0.035em] text-balance mt-3 text-5xl leading-[1.02] sm:text-6xl">
					That didn’t work<span className="text-ember">.</span>
				</h1>
				<p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
					An unexpected error stopped this page from loading. Try again, or head back home.
				</p>
				{error.digest ? <p className="tabular mt-3 text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
				<div className="mt-9 flex flex-wrap items-center gap-6">
					<Button size="lg" className="h-11 rounded-full px-5" onClick={() => retry()}>
						Try again
					</Button>
					<Link
						href="/"
						className="inline-flex h-11 items-center rounded-full px-5 text-sm font-medium shadow-[inset_0_0_0_1px_var(--input)] transition-colors hover:bg-card"
					>
						Back home
					</Link>
					<Link
						href="/dashboard"
						className="text-sm font-medium underline decoration-ember decoration-2 underline-offset-[6px] transition-colors hover:text-ember"
					>
						Go to your dashboard
					</Link>
				</div>
			</main>
		</div>
	);
}
