import { ArrowUpRight, Check } from 'lucide-react';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { ActivityHeatmap, HEATMAP_WEEKS } from '@/components/landing/activity-heatmap';
import { HeroDiagram } from '@/components/landing/hero-diagram';
import { Heading, REPO_URL, SiteFooter, SiteHeader, StartPill } from '@/components/landing/site';

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
		'Connect your editor',
		'Install the wakacraft extension for VS Code or Zed. Elsewhere, point the WakaTime plugin you already use at wakacraft with one line in ~/.wakatime.cfg.',
	],
	['Write code', 'Heartbeats arrive within a couple of minutes and your dashboard fills in by itself.'],
];

const PROMISES = [
	'Every feature is free. Nothing sits behind a paid plan.',
	'Bring your history: import everything from WakaTime in one go.',
	'AGPL-licensed. Self-host it whenever you like.',
];

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

/** The demo profile link, read per request so DEMO_USERNAME set at runtime applies; absent when there is no demo. */
async function DemoLink() {
	await connection();
	const username = process.env.DEMO_USERNAME?.trim().toLowerCase();
	return username ? <TextLink href={`/@${encodeURIComponent(username)}`}>See a live demo</TextLink> : null;
}

export default function HomePage() {
	return (
		<div className="landing flex min-h-full flex-1 flex-col">
			<SiteHeader cta={<StartPill signedOut="Get started" className="h-10 max-md:ml-auto" />} />

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
							<Suspense fallback={null}>
								<DemoLink />
							</Suspense>
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
							That’s the whole setup. JetBrains, Neovim, Sublime, Xcode and 100+ other editors.
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
								unchanged. Point the plugin at wakacraft, bring your history along, and keep coding. On VS Code and Zed,
								wakacraft&apos;s own extensions do the setup for you.
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

			<SiteFooter />
		</div>
	);
}
