import { UsernameForm } from '@/components/github-wrapped/username-form';
import { Heading, SiteFooter, SiteHeader, StartPill } from '@/components/landing/site';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'GitHub user not found' };

export default function GithubWrappedNotFound() {
	return (
		<div className="landing flex min-h-full flex-1 flex-col">
			<SiteHeader
				cta={
					<StartPill
						signedOut={
							<>
								Track <span className="max-[359px]:hidden">your </span>hours
							</>
						}
						className="h-10 whitespace-nowrap max-md:ml-auto max-sm:pr-3 max-sm:pl-4"
					/>
				}
			/>
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
				<p className="tabular text-sm text-muted-foreground">404</p>
				<Heading as="h1" className="mt-3 text-5xl leading-[1.02] sm:text-6xl">
					No GitHub user by that name
				</Heading>
				<p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
					Check the spelling, or try another username. Organizations don&apos;t have a Wrapped, only people do.
				</p>
				<UsernameForm className="mt-9" autoFocus />
			</main>
			<SiteFooter />
		</div>
	);
}
