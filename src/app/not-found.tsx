import Link from 'next/link';

import { Heading, Pill, SiteFooter, SiteHeader, StartPill } from '@/components/landing/site';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
	return (
		<div className="landing flex min-h-full flex-1 flex-col">
			<SiteHeader cta={<StartPill signedOut="Get started" className="h-10 max-md:ml-auto" />} />
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
				<p className="tabular text-sm text-muted-foreground">404</p>
				<Heading as="h1" className="mt-3 text-5xl leading-[1.02] sm:text-6xl">
					This page isn’t here
				</Heading>
				<p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
					The link may be old, or the page may have moved. Your coding time is safe.
				</p>
				<div className="mt-9 flex flex-wrap items-center gap-6">
					<Pill href="/">Back home</Pill>
					<Link
						href="/dashboard"
						className="text-sm font-medium underline decoration-ember decoration-2 underline-offset-[6px] transition-colors hover:text-ember"
					>
						Go to your dashboard
					</Link>
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
