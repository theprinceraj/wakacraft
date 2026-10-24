import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { SignedInSwitch } from '@/components/app/signed-in-switch';
import { Logo } from '@/components/app/logo';
import { ActivityHeatmap, HEATMAP_WEEKS } from '@/components/landing/activity-heatmap';
import { HeroDiagram } from '@/components/landing/hero-diagram';
import { cn } from '@/lib/utils';

const REPO_URL = 'https://github.com/theprinceraj/wakacraft';

const NAV = [
	['Features', '#features'],
	['How it works', '#how-it-works'],
	['Open source', '#open-source'],
] as const;

const FEATURES = [
	{
		title: 'Time and projects',
		points: ['Every project, branch and file', 'Daily totals and a 12-month heatmap', 'A timeline of each day'],
	},
	{
		title: 'Languages and editors',
		points: [
			'Languages, editors and machines',
			'AI-assisted versus hand-written lines',
			'Categories like coding and debugging',
		],
	},
	{
		title: 'Goals and sharing',
		points: [
			'Weekly goals and a yearly Wrapped',
			'Public profiles, teams and leaderboards',
			'README badges with your total',
		],
	},
	{
		title: 'Yours to keep',
		points: ['Import your full WakaTime history', 'Export everything as JSON', 'Invoices from tracked time'],
	},
];

const STEPS = [
	['Sign in', 'Sign in with GitHub and create an API key under Settings. It takes a few seconds.'],
	[
		'Point your plugin at wakacraft',
		'Add one line to ~/.wakatime.cfg. The WakaTime plugin you already use keeps working, unchanged.',
	],
	['Write code', 'Heartbeats arrive within a couple of minutes and your dashboard fills in by itself.'],
];

const PROMISES = [
	'Every feature is free. Nothing sits behind a paid plan.',
	'Bring your history: import everything from WakaTime in one go.',
	'AGPL-licensed. Self-host it whenever you like.',
];

function Pill({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
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

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<a
			href={href}
			className="text-sm font-medium underline decoration-ember decoration-2 underline-offset-[6px] transition-colors hover:text-ember"
		>
			{children}
		</a>
	);
}

/** The primary call to action, which sends signed-in visitors to their dashboard instead of sign-in. */
function StartPill({ signedOut, className }: { signedOut: string; className?: string }) {
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
function Heading({
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

export default function HomePage() {
	return (
		<div className="landing flex min-h-full flex-1 flex-col">
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
					<StartPill signedOut="Get started" className="h-10 max-md:ml-auto" />
				</div>
			</header>

			<main className="flex-1">
				{/* Hero */}
				<section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1fr_560px] lg:pt-16 lg:pb-28">
					<div className="max-w-xl">
						<Heading as="h1" className="text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
							Know where your coding hours go
						</Heading>
						<p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
							wakacraft turns your editor activity into a precise, private record of your work. It speaks the WakaTime
							API, so the plugin you already use works with one line of config. Every feature is free, and you can
							self-host it.
						</p>
						<div className="mt-9 flex flex-wrap items-center gap-6">
							<StartPill signedOut="Start tracking free" />
							<TextLink href="#how-it-works">see how it works</TextLink>
						</div>
					</div>
					<div className="max-lg:hidden">
						<HeroDiagram />
					</div>
				</section>

				{/* Problem statement */}
				<section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
					<blockquote className="text-3xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-4xl">
						“Timers get forgotten. <span className="text-ember">Your editor doesn’t.</span>”
					</blockquote>
					<div className="space-y-4 text-lg leading-relaxed text-muted-foreground lg:pt-2">
						<p>
							Start-stop timers depend on you remembering to press a button, and estimates at the end of the week are
							guesses. Neither tells you where the time really went.
						</p>
						<p>
							wakacraft listens to the heartbeats your editor already sends while you work, and turns them into time per
							project, language and branch. Nothing to start, nothing to stop.
						</p>
					</div>
				</section>

				{/* Features */}
				<section id="features" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
					<h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">What wakacraft shows you</h2>
					<div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<div className="flex flex-col justify-between gap-8 rounded-[28px] bg-ink p-7 text-ink-foreground md:col-span-2 md:row-span-2">
							<ActivityHeatmap />
							<dl className="grid grid-cols-3 gap-4 border-y border-ink-foreground/10 py-6">
								{[
									['112', 'days coded'],
									['12', 'day streak'],
									['4h 18m', 'daily average'],
								].map(([value, label]) => (
									<div key={label}>
										<dt className="sr-only">{label}</dt>
										<dd className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</dd>
										<dd className="mt-1 text-xs text-ink-foreground/60">{label}</dd>
									</div>
								))}
							</dl>
							<div>
								<p className="text-sm text-ink-foreground/60">Last {HEATMAP_WEEKS} weeks</p>
								<p className="mt-1 text-3xl font-semibold tracking-tight">Every day you coded, at a glance.</p>
							</div>
						</div>
						{FEATURES.map(({ title, points }) => (
							<article key={title} className="flex flex-col rounded-[28px] bg-card p-7">
								<ArrowUpRight className="ml-auto size-5 text-foreground/70" />
								<h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
								<ul className="mt-5 space-y-2 text-sm text-muted-foreground">
									{points.map((point) => (
										<li key={point} className="flex gap-2.5">
											<span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/60" />
											{point}
										</li>
									))}
								</ul>
							</article>
						))}
					</div>
				</section>

				{/* Introduction */}
				<section
					id="open-source"
					className="mx-auto grid w-full max-w-7xl scroll-mt-20 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-28"
				>
					<div className="min-w-0 rounded-[28px] bg-ink p-7 text-ink-foreground sm:p-9">
						<p className="text-xs tracking-[0.16em] text-ink-foreground/50 uppercase">~/.wakatime.cfg</p>
						<pre className="tabular mt-5 overflow-x-auto text-sm leading-7">
							<span className="text-ink-foreground/50">[settings]</span>
							{'\n'}
							<span className="text-ember">api_url</span> = https://wakacraft.tech/api/v1
							{'\n'}
							<span className="text-ember">api_key</span> = waka_…
						</pre>
						<p className="mt-8 border-t border-ink-foreground/10 pt-5 text-sm text-ink-foreground/60">
							That’s the whole setup. VS Code, Cursor, JetBrains, Neovim, Zed, Xcode and 100+ other editors.
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Meet wakacraft</p>
						<Heading className="mt-3 text-3xl leading-tight sm:text-4xl">
							An open-source home for your coding time, built on the WakaTime API
						</Heading>
						<div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
							<p>
								wakacraft implements the same HTTP API as WakaTime, so every WakaTime editor plugin works with it
								unchanged. Point the plugin at wakacraft, bring your history along, and keep coding.
							</p>
							<p>
								It’s AGPL-licensed and built in the open. Use the hosted instance at wakacraft.tech, or run your own on
								Vercel and MongoDB.
							</p>
						</div>
						<div className="mt-8">
							<TextLink href={REPO_URL}>read the source on GitHub</TextLink>
						</div>
					</div>
				</section>

				{/* Steps */}
				<section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
					<Heading className="text-3xl sm:text-4xl">Up and running in two minutes</Heading>
					<ol className="mt-10 grid gap-4 md:grid-cols-3">
						{STEPS.map(([title, body], index) => (
							<li key={title} className="rounded-[28px] bg-card p-7">
								<p className="tabular text-sm text-muted-foreground">0{index + 1}</p>
								<h3 className="mt-10 font-semibold">{title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
							</li>
						))}
					</ol>
				</section>

				{/* Call to action */}
				<section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pt-8 pb-24 sm:px-6 lg:grid-cols-[1.9fr_1fr]">
					<div className="rounded-[28px] bg-card p-8 sm:p-14">
						<h2 className="max-w-lg text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
							Let’s see where your <span className="text-ember">time</span> really goes
						</h2>
						<ul className="mt-8 divide-y border-y">
							{PROMISES.map((promise) => (
								<li key={promise} className="flex items-center gap-3 py-4 text-sm">
									<Check className="size-4 shrink-0 text-ember" strokeWidth={2.5} />
									{promise}
								</li>
							))}
						</ul>
						<div className="mt-10 flex flex-wrap items-center gap-6">
							<StartPill signedOut="Start tracking free" />
							<TextLink href={REPO_URL}>or self-host it</TextLink>
						</div>
					</div>
					<div className="flex min-h-72 flex-col justify-between rounded-[28px] bg-ember p-8 text-primary-foreground">
						<p className="text-sm text-primary-foreground/80">This week, for example</p>
						<div>
							<p className="text-6xl font-semibold tracking-[-0.04em]">23h 40m</p>
							<div className="mt-6 space-y-2.5 text-sm">
								{[
									['TypeScript', 62],
									['Rust', 24],
									['Markdown', 14],
								].map(([language, share]) => (
									<div key={language}>
										<div className="flex justify-between text-primary-foreground/90">
											<span>{language}</span>
											<span className="tabular">{share}%</span>
										</div>
										<div className="mt-1 h-1.5 rounded-full bg-primary-foreground/25">
											<div className="h-full rounded-full bg-primary-foreground" style={{ width: `${share}%` }} />
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
			</main>

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
						</ul>
					</div>
				</div>
				<div className="mx-auto w-full max-w-7xl border-t px-4 py-6 text-xs text-muted-foreground sm:px-6">
					© 2026 wakacraft · AGPL-3.0
				</div>
			</footer>
		</div>
	);
}
