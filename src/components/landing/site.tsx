import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { Logo } from '@/components/app/logo';
import { SignedInSwitch } from '@/components/app/signed-in-switch';
import { cn } from '@/lib/utils';

/** The homepage's header, footer and type, shared with the sign-in page so the two read as one site. */

export const REPO_URL = 'https://github.com/theprinceraj/wakacraft';

/** Rooted at `/` so the links also work from pages other than the homepage. */
export const NAV = [
	['Features', '/#features'],
	['How it works', '/#how-it-works'],
	['Open source', '/#open-source'],
	['GitHub Wrapped', '/github-wrapped'],
] as const;

export function Pill({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
	return (
		<Link
			href={href}
			className={cn(
				'group inline-flex h-11 items-center gap-2 rounded-full bg-primary pr-4 pl-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
				className,
			)}
		>
			{children}
			<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
		</Link>
	);
}

/** The primary call to action, which sends signed-in visitors to their dashboard instead of sign-in. */
export function StartPill({ signedOut, className }: { signedOut: string; className?: string }) {
	const fallback = (
		<Pill href="/login" className={className}>
			{signedOut}
		</Pill>
	);
	return (
		<Suspense fallback={fallback}>
			<SignedInSwitch
				signedIn={
					<Pill href="/dashboard" className={className}>
						Open your dashboard
					</Pill>
				}
				signedOut={fallback}
			/>
		</Suspense>
	);
}

/** Headline with an orange full stop, wakacraft's nod to the spark in the logo. */
export function Heading({
	as: Tag = 'h2',
	children,
	className,
}: {
	as?: 'h1' | 'h2';
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Tag className={cn('font-semibold tracking-[-0.035em] text-balance', className)}>
			{children}
			<span className="text-ember">.</span>
		</Tag>
	);
}

export function SiteHeader({ cta }: { cta: React.ReactNode }) {
	return (
		<header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 px-4 sm:px-6">
				<Link href="/" className="text-foreground">
					<Logo />
				</Link>
				<nav className="ml-auto flex items-center gap-7 text-sm max-md:hidden">
					{NAV.map(([label, href]) => (
						<a key={href} href={href} className="text-foreground/80 transition-colors hover:text-foreground">
							{label}
						</a>
					))}
				</nav>
				{cta}
			</div>
		</header>
	);
}

export function SiteFooter() {
	return (
		<footer className="bg-card">
			<div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
				<div className="max-w-xs">
					<Logo />
					<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
						Automatic time tracking for developers. Open source, WakaTime-compatible, and free.
					</p>
				</div>
				<div>
					<p className="text-sm font-semibold">Product</p>
					<ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
						{NAV.map(([label, href]) => (
							<li key={href}>
								<a href={href} className="hover:text-foreground">
									{label}
								</a>
							</li>
						))}
						<li>
							<Link href="/login" className="hover:text-foreground">
								Sign in
							</Link>
						</li>
					</ul>
				</div>
				<div>
					<p className="text-sm font-semibold">Open source</p>
					<ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
						<li>
							<a href={REPO_URL} className="hover:text-foreground">
								GitHub
							</a>
						</li>
						<li>
							<a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-foreground">
								AGPL-3.0 license
							</a>
						</li>
						<li>
							<a href={`${REPO_URL}#deploying-to-vercel`} className="hover:text-foreground">
								Self-host
							</a>
						</li>
						<li>
							<Link href="/privacy" className="hover:text-foreground">
								Privacy
							</Link>
						</li>
						<li>
							<Link href="/terms" className="hover:text-foreground">
								Terms
							</Link>
						</li>
					</ul>
				</div>
			</div>
			<div className="mx-auto w-full max-w-7xl border-t px-4 py-6 text-xs text-muted-foreground sm:px-6">
				© 2026 wakacraft · AGPL-3.0
			</div>
		</footer>
	);
}
