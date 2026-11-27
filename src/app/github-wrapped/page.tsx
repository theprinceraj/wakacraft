import { CalendarDays, Flame, Sparkles, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { UsernameForm } from '@/components/github-wrapped/username-form';
import { ActivityHeatmap } from '@/components/landing/activity-heatmap';
import { Heading, SiteFooter, SiteHeader, StartPill } from '@/components/landing/site';
import { GithubLoginSchema } from '@/server/github-wrapped/github-wrapped.request.dto';

import type { Metadata } from 'next';

const title = 'GitHub Wrapped';
const description =
	'Your year on GitHub, wrapped: contributions, streaks, your biggest day, top repositories and your coding personality. Free, no sign-in.';

export const metadata: Metadata = {
	title,
	description,
	openGraph: { type: 'website', siteName: 'wakacraft', title: `${title} · wakacraft`, description },
	twitter: { card: 'summary_large_image', title: `${title} · wakacraft`, description },
};

const INSIDE = [
	{
		icon: CalendarDays,
		title: 'Your whole year',
		body: 'Every contribution, the days you showed up and your busiest month.',
	},
	{
		icon: Flame,
		title: 'Streaks and big days',
		body: 'Your longest run, your current streak and the day you went all in.',
	},
	{ icon: Trophy, title: 'Top repositories', body: 'Where your commits went and the languages they were written in.' },
	{ icon: Sparkles, title: 'Your personality', body: 'Streak Keeper, Weekend Warrior, Gatekeeper… which one are you?' },
];

/** Without JavaScript the form submits `?u=`; send it on to the wrapped page, or back with the error. */
async function FormWithQuery({ searchParams }: Pick<PageProps<'/github-wrapped'>, 'searchParams'>) {
	const { u } = await searchParams;
	if (typeof u !== 'string' || !u.trim()) return <UsernameForm autoFocus />;
	const parsed = GithubLoginSchema.safeParse(u);
	if (parsed.success) redirect(`/github-wrapped/${encodeURIComponent(parsed.data)}`);
	return <UsernameForm defaultValue={u} error={parsed.error.issues[0]?.message} autoFocus />;
}

async function Year() {
	await connection();
	return <>{new Date().getUTCFullYear()}</>;
}

export default function GithubWrappedLanding({ searchParams }: PageProps<'/github-wrapped'>) {
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

			<main className="flex-1 overflow-x-clip">
				<section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1fr_480px] lg:pt-20 lg:pb-28">
					<div className="max-w-xl">
						<p className="text-xs font-medium tracking-[0.16em] text-ember-text uppercase">
							GitHub Wrapped{' '}
							<Suspense fallback={null}>
								<Year />
							</Suspense>
						</p>
						<Heading as="h1" className="mt-4 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
							Your year on GitHub, wrapped
						</Heading>
						<p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
							Type a GitHub username and get the story of its year: every contribution, the streaks, the biggest day,
							the top repositories and a coding personality to share. No sign-in, nothing to install.
						</p>
						<div className="mt-9">
							<Suspense fallback={<UsernameForm />}>
								<FormWithQuery searchParams={searchParams} />
							</Suspense>
						</div>
						<p className="mt-4 text-sm text-muted-foreground">
							Reads public GitHub activity only. Works for any username.
						</p>
					</div>

					{/* A sample card, made up, so the page shows what's coming. */}
					<div className="relative mx-auto w-full max-w-[480px]" aria-hidden>
						<div className="absolute -top-4 -right-3 z-10 rotate-6 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
							The Streak Keeper
						</div>
						<div className="-rotate-2 rounded-[28px] bg-ink p-7 text-ink-foreground shadow-2xl shadow-ink/20">
							<p className="text-xs tracking-[0.16em] text-ink-foreground/60 uppercase">@you · wrapped</p>
							<p className="mt-6 text-7xl font-semibold tracking-[-0.05em] text-[oklch(0.76_0.16_55)]">1,284</p>
							<p className="mt-1 text-sm text-ink-foreground/70">contributions across 212 days</p>
							<ActivityHeatmap className="mt-8" />
							<div className="mt-7 grid grid-cols-3 gap-4 border-t border-ink-foreground/10 pt-5 text-sm">
								{[
									['47', 'day streak'],
									['Tue', 'best weekday'],
									['63', 'on one day'],
								].map(([value, label]) => (
									<div key={label}>
										<p className="text-2xl font-semibold tracking-tight">{value}</p>
										<p className="text-xs text-ink-foreground/60">{label}</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
					<Heading className="text-3xl sm:text-4xl">What&apos;s inside</Heading>
					<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{INSIDE.map(({ icon: Icon, title: itemTitle, body }) => (
							<article key={itemTitle} className="rounded-[28px] bg-card p-7">
								<Icon className="size-5 text-ember" aria-hidden />
								<h2 className="mt-8 text-xl font-semibold tracking-[-0.03em]">{itemTitle}</h2>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
							</article>
						))}
					</div>
				</section>

				<section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-24 sm:px-6">
					<div className="grid items-center gap-8 rounded-[28px] bg-card p-8 sm:p-14 lg:grid-cols-[1.4fr_1fr]">
						<div>
							<Heading className="text-3xl leading-tight sm:text-4xl">
								The one stat GitHub can&apos;t give you: <span className="text-ember">hours</span>
							</Heading>
							<p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
								Contribution graphs count commits, not the time behind them. wakacraft tracks your coding time straight
								from your editor, per project, language and branch. Free and open source, and it works with every
								WakaTime plugin.
							</p>
						</div>
						<div className="lg:justify-self-end">
							<StartPill signedOut="Start tracking free" />
						</div>
					</div>
				</section>
			</main>

			<SiteFooter />
		</div>
	);
}
