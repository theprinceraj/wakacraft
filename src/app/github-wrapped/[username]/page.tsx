import { Flame, GitCommitHorizontal, GitPullRequest, MessageSquareCode, Star, CircleDot } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { cache, Suspense } from 'react';

import { chipClass } from '@/components/app/chip';
import { ContributionGraph, GraphLegend } from '@/components/github-wrapped/contribution-graph';
import { CountUp, Reveal } from '@/components/github-wrapped/motion';
import { ShareActions } from '@/components/github-wrapped/share-actions';
import { UsernameForm } from '@/components/github-wrapped/username-form';
import { Heading, SiteFooter, SiteHeader, StartPill } from '@/components/landing/site';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDay, formatPercent } from '@/lib/format';
import { clientIp } from '@/lib/http/client-ip';
import { TooManyRequestsException } from '@/lib/http/errors';
import { connectMongo } from '@/lib/mongo/connection';
import { PUBLIC_ORIGIN } from '@/lib/public-origin';
import { cn } from '@/lib/utils';
import { GithubWrappedError } from '@/server/github-wrapped/github-wrapped.client';
import { GithubLoginSchema, GithubWrappedYearSchema } from '@/server/github-wrapped/github-wrapped.request.dto';
import { githubWrappedService } from '@/server/github-wrapped/github-wrapped.service';

import type { GithubWrapped } from '@/server/github-wrapped/derive';
import type { Metadata } from 'next';

type Props = PageProps<'/github-wrapped/[username]'>;

/** The login in the URL, or null when it isn't valid percent-encoding or a possible GitHub username. */
const loginOf = (segment: string) => {
	try {
		const parsed = GithubLoginSchema.safeParse(decodeURIComponent(segment));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
};

const yearOf = (value: string | string[] | undefined) => {
	const parsed = GithubWrappedYearSchema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
};

/**
 * Rate limit, then load: once per request, shared by the metadata and the page so neither can reach GitHub
 * without counting against the visitor's limit.
 */
const lookUp = cache(async (login: string, year: number) => {
	await connectMongo();
	await githubWrappedService.consumeRateLimit(clientIp(await headers()));
	return githubWrappedService.get(login, year);
});

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
	const login = loginOf((await params).username);
	if (!login) return { title: 'GitHub Wrapped' };
	await connection();
	const year = githubWrappedService.clampYear(yearOf((await searchParams).year));
	const result = await lookUp(login, year).catch(() => null);
	const wrapped = result?.status === 'ok' ? result.wrapped : null;

	const title = `@${wrapped?.login ?? login}'s ${year} GitHub Wrapped`;
	const description = wrapped
		? `${wrapped.total.toLocaleString('en-US')} contributions, a ${wrapped.longestStreak?.days ?? 0}-day streak and one coding personality: ${wrapped.archetype.title}. Get yours.`
		: 'Your year on GitHub, wrapped: streaks, best days, top repositories and your coding personality.';
	return {
		title,
		description,
		openGraph: { type: 'website', siteName: 'wakacraft', title, description },
		twitter: { card: 'summary_large_image', title, description },
	};
}

export default function GithubWrappedPage({ params, searchParams }: Props) {
	return (
		<div className="landing flex min-h-full flex-1 flex-col">
			<SiteHeader
				cta={
					<StartPill
						signedOut="Track your hours"
						className="h-10 whitespace-nowrap max-md:ml-auto max-sm:pr-3 max-sm:pl-4"
					/>
				}
			/>
			<main className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-6">
				<Suspense fallback={<WrappedSkeleton />}>
					<Wrapped params={params} searchParams={searchParams} />
				</Suspense>
			</main>
			<SiteFooter />
		</div>
	);
}

function WrappedSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-busy aria-label="Wrapping your year">
			<Skeleton className="h-72 rounded-[28px]" />
			<Skeleton className="h-56 rounded-[28px]" />
			<Skeleton className="h-64 rounded-[28px]" />
		</div>
	);
}

function Problem({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col items-start py-16">
			<Heading as="h1" className="text-4xl leading-tight sm:text-5xl">
				{title}
			</Heading>
			<p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">{children}</p>
			<UsernameForm className="mt-9" />
		</section>
	);
}

async function Wrapped({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
	const login = loginOf((await params).username);
	if (!login) notFound();
	await connection();
	const year = githubWrappedService.clampYear(yearOf((await searchParams).year));

	let result;
	try {
		result = await lookUp(login, year);
	} catch (error) {
		if (error instanceof TooManyRequestsException) {
			return (
				<Problem title="That's a lot of wrapping">
					You&apos;ve opened a lot of Wrapped pages in the last few minutes. Give it a moment and try again.
				</Problem>
			);
		}
		if (error instanceof GithubWrappedError) {
			return error.reason === 'not_configured' ? (
				<Problem title="GitHub Wrapped isn't switched on here">
					This wakacraft instance has no GitHub token configured, so it can&apos;t read contribution graphs yet.
				</Problem>
			) : (
				<Problem title="GitHub is catching its breath">
					We couldn&apos;t reach GitHub just now. Try again in a minute or two.
				</Problem>
			);
		}
		throw error;
	}
	if (result.status === 'not_found') notFound();

	return <Story wrapped={result.wrapped} />;
}

const nf = (value: number) => value.toLocaleString('en-US');
const longDay = (date: string) => formatDay(date, { weekday: 'long', month: 'long', day: 'numeric' });
const shortDay = (date: string) => formatDay(date, { month: 'short', day: 'numeric' });

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
	return <p className={cn('text-xs font-medium tracking-[0.16em] uppercase opacity-70', className)}>{children}</p>;
}

function Story({ wrapped: w }: { wrapped: GithubWrapped }) {
	const display = w.name ?? `@${w.login}`;
	const url = `${PUBLIC_ORIGIN}/github-wrapped/${w.login}${w.year === githubWrappedService.currentYear() ? '' : `?year=${w.year}`}`;
	const shareText = `My ${w.year} on GitHub: ${nf(w.total)} contributions, a ${w.longestStreak?.days ?? 0}-day streak, and apparently I'm "${w.archetype.title}". Get your GitHub Wrapped:`;
	const years = Array.from(
		{ length: Math.min(6, githubWrappedService.currentYear() - w.memberSince + 1) },
		(_, i) => githubWrappedService.currentYear() - i,
	);
	const maxWeekday = Math.max(1, ...w.weekdays.map((day) => day.count));
	const maxMonth = Math.max(1, ...w.months.map((month) => month.count));
	const activeShare = w.daysElapsed ? Math.round((w.activeDays / w.daysElapsed) * 100) : 0;
	const bestMultiple =
		w.bestDay && w.averagePerActiveDay ? Math.round((w.bestDay.count / w.averagePerActiveDay) * 10) / 10 : null;

	const breakdown = [
		{ label: 'Commits', value: w.commits, icon: GitCommitHorizontal },
		{ label: 'Pull requests', value: w.pullRequests, icon: GitPullRequest },
		{ label: 'Code reviews', value: w.reviews, icon: MessageSquareCode },
		{ label: 'Issues', value: w.issues, icon: CircleDot },
	];

	return (
		<div className="flex flex-col gap-4 *:min-w-0">
			{/* 1. Intro */}
			<section className="relative overflow-hidden rounded-[28px] bg-card px-6 py-10 sm:px-10 sm:py-14">
				<Reveal>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<Avatar className="size-12">
								<AvatarImage src={w.avatarUrl} alt="" />
								<AvatarFallback>{w.login.slice(0, 2).toUpperCase()}</AvatarFallback>
							</Avatar>
							<div>
								<p className="font-semibold">{display}</p>
								<a
									href={`https://github.com/${w.login}`}
									target="_blank"
									rel="noreferrer"
									className="font-mono text-[13px] text-muted-foreground hover:text-foreground"
								>
									github.com/{w.login}
								</a>
							</div>
						</div>
						{years.length > 1 ? (
							<nav className="flex max-w-full flex-wrap gap-1.5" aria-label="Year">
								{years.map((item) => (
									<Link
										key={item}
										href={`/github-wrapped/${w.login}${item === githubWrappedService.currentYear() ? '' : `?year=${item}`}`}
										aria-current={item === w.year ? 'true' : undefined}
										className={chipClass(item === w.year)}
									>
										{item}
									</Link>
								))}
							</nav>
						) : null}
					</div>
				</Reveal>
				<Reveal delay={0.1}>
					<Eyebrow className="mt-14 text-ember-text opacity-100">GitHub Wrapped {w.year}</Eyebrow>
					<Heading as="h1" className="mt-3 text-4xl leading-[1.05] sm:text-6xl">
						{display}&apos;s {w.year}, wrapped
					</Heading>
				</Reveal>
				<Reveal delay={0.2} className="mt-12">
					<p className="text-[clamp(4.5rem,16vw,10rem)] leading-[0.9] font-semibold tracking-[-0.06em] text-ember">
						<CountUp value={w.total} />
					</p>
					<p className="mt-4 max-w-xl text-lg text-muted-foreground">
						{w.total === 1 ? 'contribution' : 'contributions'} across{' '}
						<b className="font-semibold text-foreground">{nf(w.activeDays)} active days</b>
						{w.isPartialYear ? <>, and the year isn&apos;t over yet</> : null}.
						{w.privateContributions ? ` ${nf(w.privateContributions)} of them in private repositories.` : ''}
					</p>
				</Reveal>
			</section>

			{w.total === 0 ? (
				<section className="rounded-[28px] bg-ink p-8 text-ink-foreground sm:p-12">
					<Heading className="text-3xl sm:text-4xl">A quiet year on the graph</Heading>
					<p className="mt-4 max-w-lg text-ink-foreground/70">
						No public contributions in {w.year} yet. That doesn&apos;t mean no code: plenty of work never reaches a
						green square. wakacraft counts the hours you spend in your editor instead.
					</p>
				</section>
			) : (
				<>
					{/* 2. Breakdown */}
					<section className="tile-ink rounded-[28px] p-6 sm:p-10">
						<Reveal>
							<Eyebrow>How it broke down</Eyebrow>
							<p className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
								Every one of those squares was something you shipped.
							</p>
						</Reveal>
						<div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
							{breakdown.map(({ label, value, icon: Icon }, index) => (
								<Reveal key={label} delay={0.08 * index}>
									<Icon className="size-5 text-on-ink-ember" aria-hidden />
									<p className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
										<CountUp value={value} />
									</p>
									<p className="mt-1 text-sm text-muted-foreground">{label}</p>
								</Reveal>
							))}
						</div>
						{w.newRepos ? (
							<p className="mt-10 border-t pt-5 text-sm text-muted-foreground">
								Plus {nf(w.newRepos)} new {w.newRepos === 1 ? 'repository' : 'repositories'} started from scratch.
							</p>
						) : null}
					</section>

					{/* 3. The graph */}
					<section className="tile-ink rounded-[28px] p-6 sm:p-10">
						<Reveal>
							<div className="flex flex-wrap items-end justify-between gap-4">
								<div>
									<Eyebrow>The whole year</Eyebrow>
									<p className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
										You showed up on {activeShare}% of days.
									</p>
								</div>
								<GraphLegend />
							</div>
							<div className="mt-8">
								<ContributionGraph days={w.days} />
							</div>
						</Reveal>
						<dl className="mt-8 grid grid-cols-2 gap-6 border-t pt-6 sm:grid-cols-3">
							<div>
								<dt className="text-sm text-muted-foreground">Longest streak</dt>
								<dd className="mt-1 text-3xl font-semibold tracking-tight">
									{w.longestStreak ? `${nf(w.longestStreak.days)} days` : '—'}
								</dd>
								{w.longestStreak && w.longestStreak.days > 1 ? (
									<dd className="mt-0.5 text-xs text-muted-foreground">
										{shortDay(w.longestStreak.start)} – {shortDay(w.longestStreak.end)}
									</dd>
								) : null}
							</div>
							<div>
								<dt className="text-sm text-muted-foreground">Active days</dt>
								<dd className="mt-1 text-3xl font-semibold tracking-tight">{nf(w.activeDays)}</dd>
								<dd className="mt-0.5 text-xs text-muted-foreground">of {nf(w.daysElapsed)}</dd>
							</div>
							{w.isPartialYear ? (
								<div>
									<dt className="text-sm text-muted-foreground">Current streak</dt>
									<dd className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight whitespace-nowrap">
										{nf(w.currentStreak)} {w.currentStreak === 1 ? 'day' : 'days'}
										{w.currentStreak >= 3 ? <Flame className="size-6 text-on-ink-ember" aria-hidden /> : null}
									</dd>
								</div>
							) : null}
						</dl>
					</section>

					{/* 4. Best day */}
					{w.bestDay ? (
						<section className="rounded-[28px] bg-ember p-6 text-primary-foreground sm:p-10">
							<Reveal>
								<Eyebrow>Your biggest day</Eyebrow>
								<p className="mt-6 text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">
									On {longDay(w.bestDay.date)}, you made {nf(w.bestDay.count)}{' '}
									{w.bestDay.count === 1 ? 'contribution' : 'contributions'}.
								</p>
								{bestMultiple && bestMultiple >= 1.5 ? (
									<p className="mt-5 text-lg text-primary-foreground/85">
										That&apos;s {bestMultiple}× your average active day. Whatever happened, it worked.
									</p>
								) : null}
							</Reveal>
						</section>
					) : null}

					{/* 5. Rhythm */}
					<div className="grid grid-cols-1 gap-4 *:min-w-0 md:grid-cols-2">
						<section className="rounded-[28px] bg-card p-6 sm:p-8">
							<Reveal>
								<Eyebrow>Your week</Eyebrow>
								<p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
									{w.busiestWeekday ? `You're a ${w.busiestWeekday} person.` : 'Every day alike.'}
								</p>
								<div className="mt-8 flex h-40 items-end gap-2" aria-hidden>
									{w.weekdays.map((day) => (
										<div key={day.name} className="flex h-full flex-1 flex-col justify-end gap-2">
											<div
												className={cn(
													'w-full rounded-t-md',
													day.name === w.busiestWeekday ? 'bg-ember' : 'bg-foreground/15',
												)}
												style={{ height: `${Math.max(3, (day.count / maxWeekday) * 100)}%` }}
											/>
											<span className="text-center text-xs text-muted-foreground">{day.name.slice(0, 3)}</span>
										</div>
									))}
								</div>
								<p className="mt-6 text-sm text-muted-foreground">
									{Math.round(w.weekendShare * 100)}% of your contributions landed on a weekend.
								</p>
							</Reveal>
						</section>
						<section className="rounded-[28px] bg-card p-6 sm:p-8">
							<Reveal>
								<Eyebrow>Your months</Eyebrow>
								<p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
									{w.busiestMonth ? `${w.busiestMonth} was your big one.` : 'An even year.'}
								</p>
								<div className="mt-8 flex h-40 items-end gap-1.5" aria-hidden>
									{w.months.map((month) => (
										<div key={month.name} className="flex h-full flex-1 flex-col justify-end gap-2">
											<div
												className={cn(
													'w-full rounded-t-md',
													month.name === w.busiestMonth ? 'bg-ember' : 'bg-foreground/15',
												)}
												style={{ height: `${Math.max(3, (month.count / maxMonth) * 100)}%` }}
											/>
											<span className="text-center text-xs text-muted-foreground">{month.name.slice(0, 1)}</span>
										</div>
									))}
								</div>
								<p className="mt-6 text-sm text-muted-foreground">
									{nf(Math.round(w.averagePerActiveDay * 10) / 10)} contributions on an average active day.
								</p>
							</Reveal>
						</section>
					</div>

					{/* 6. Repos and languages */}
					{w.repos.length ? (
						<div className="grid grid-cols-1 gap-4 *:min-w-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
							<section className="rounded-[28px] bg-card p-6 sm:p-8">
								<Reveal>
									<Eyebrow>Where your commits went</Eyebrow>
									<ol className="mt-6 flex flex-col gap-4">
										{w.repos.map((repo, index) => (
											<li key={repo.name} className="flex items-center gap-4">
												<span className="w-5 text-2xl font-semibold text-muted-foreground tabular-nums">
													{index + 1}
												</span>
												<div className="min-w-0 flex-1">
													<a
														href={`https://github.com/${repo.name}`}
														target="_blank"
														rel="noreferrer"
														className="block truncate font-medium hover:text-ember-text"
													>
														{repo.name}
													</a>
													<p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
														{repo.language ? (
															<span className="inline-flex items-center gap-1.5">
																<span
																	className="size-2 rounded-full"
																	style={{ background: repo.color ?? 'var(--quiet)' }}
																/>
																{repo.language}
															</span>
														) : null}
														{repo.stars ? (
															<span className="inline-flex items-center gap-1">
																<Star className="size-3" aria-hidden /> {nf(repo.stars)}
															</span>
														) : null}
													</p>
												</div>
												<span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
													{nf(repo.commits)} {repo.commits === 1 ? 'commit' : 'commits'}
												</span>
											</li>
										))}
									</ol>
								</Reveal>
							</section>
							{w.languages.length ? (
								<section className="rounded-[28px] bg-card p-6 sm:p-8">
									<Reveal>
										<Eyebrow>Your languages</Eyebrow>
										<p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Mostly {w.languages[0].name}.</p>
										<div className="mt-6 flex h-3 overflow-hidden rounded-full" aria-hidden>
											{w.languages.map((language) => (
												<span
													key={language.name}
													style={{ width: `${language.percent}%`, background: language.color ?? 'var(--quiet)' }}
												/>
											))}
										</div>
										<ul className="mt-6 flex flex-col gap-2.5 text-sm">
											{w.languages.map((language) => (
												<li key={language.name} className="flex items-center gap-2.5">
													<span
														className="size-2.5 rounded-full"
														style={{ background: language.color ?? 'var(--quiet)' }}
													/>
													<span className="flex-1">{language.name}</span>
													<span className="text-muted-foreground tabular-nums">{formatPercent(language.percent)}</span>
												</li>
											))}
										</ul>
										<p className="mt-5 text-xs text-muted-foreground">
											By commits to each public repository&apos;s main language.
										</p>
									</Reveal>
								</section>
							) : null}
						</div>
					) : null}

					{/* 7. Archetype */}
					<section className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-14 text-center text-ink-foreground sm:px-10 sm:py-20">
						<Reveal>
							<Eyebrow>Your {w.year} coding personality</Eyebrow>
							<p className="mt-6 text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-on-ink-ember">
								{w.archetype.title}
							</p>
							<p className="mx-auto mt-6 max-w-lg text-lg text-ink-foreground/75">{w.archetype.line}</p>
						</Reveal>
					</section>
				</>
			)}

			{/* 8. The missing stat: the pitch */}
			<section className="grid grid-cols-1 gap-4 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
				<div className="flex flex-col justify-between gap-10 rounded-[28px] bg-ember p-6 text-primary-foreground sm:p-10">
					<Eyebrow>Hours spent coding in {w.year}</Eyebrow>
					<p className="text-[clamp(4rem,12vw,7rem)] leading-none font-semibold tracking-[-0.05em]">
						???<span className="text-primary-foreground/60">h</span>
					</p>
					<p className="text-lg text-primary-foreground/90">GitHub has no idea. Neither do you, yet.</p>
				</div>
				<div className="flex flex-col justify-between rounded-[28px] bg-card p-6 sm:p-10">
					<div>
						<Heading className="text-3xl leading-tight sm:text-4xl">
							GitHub counts the commits. wakacraft counts the hours behind them
						</Heading>
						<p className="mt-5 leading-relaxed text-muted-foreground">
							Every contribution above took time nobody measured. wakacraft listens to your editor and tells you exactly
							where it went: per project, language and branch, with no timers to forget. Free, open source, and it works
							with the WakaTime plugin you may already have.
						</p>
					</div>
					<div className="mt-10 flex flex-wrap items-center gap-6">
						<StartPill signedOut="Start tracking free" />
						<Link
							href="/#how-it-works"
							className="text-sm font-medium underline decoration-ember decoration-2 underline-offset-[6px] transition-colors hover:text-ember"
						>
							see how it works
						</Link>
					</div>
					<p className="mt-6 text-sm text-muted-foreground">
						Start now and next year&apos;s Wrapped comes with the hours.
					</p>
				</div>
			</section>

			{/* 9. Share */}
			<section className="flex flex-col gap-10 rounded-[28px] bg-card p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<Eyebrow>Pass it on</Eyebrow>
					<p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Share your Wrapped</p>
					<div className="mt-6">
						<ShareActions url={url} text={shareText} />
					</div>
				</div>
				<div className="w-full max-w-md lg:max-w-sm lg:flex-1">
					<p className="mb-3 text-sm text-muted-foreground">Wrap someone else</p>
					<UsernameForm />
				</div>
			</section>
		</div>
	);
}
