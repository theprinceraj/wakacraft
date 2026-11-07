import { AtSign, Briefcase, GitBranch, Globe, Lock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { Tag } from '@/components/app/chip';
import { Logo } from '@/components/app/logo';
import { EmptyState, PageSkeleton } from '@/components/app/states';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { BreakdownBar } from '@/components/dashboard/breakdown-bar';
import { seriesColor } from '@/components/dashboard/colors';
import { Panel } from '@/components/dashboard/panel';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatRow, StatTile } from '@/components/dashboard/stat-tile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCategory, formatDuration, initialsOf } from '@/lib/format';
import { NotFoundException } from '@/lib/http/errors';
import { connectMongo } from '@/lib/mongo/connection';
import { publicProfileService } from '@/server/user/public-profile.service';

import type { StatItem } from '@/server/stats/stats.response.dto';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: PageProps<'/u/[username]'>): Promise<Metadata> {
	const { username } = await params;
	return { title: `@${decodeURIComponent(username)}` };
}

export default function PublicProfilePage({ params }: PageProps<'/u/[username]'>) {
	return (
		<div className="flex min-h-full flex-1 flex-col">
			<header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
				<Link href="/" className="rounded-lg text-foreground">
					<Logo />
				</Link>
				<Link
					href="/login"
					className="text-right text-[13px] font-medium underline decoration-ember decoration-2 underline-offset-[6px] transition-colors hover:text-ember-text"
				>
					track your own coding time
				</Link>
			</header>
			<main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-20 sm:px-6">
				<Suspense fallback={<PageSkeleton />}>
					<Profile params={params} />
				</Suspense>
			</main>
		</div>
	);
}

const toBreakdown = (items: StatItem[]) =>
	items.map((item) => ({ name: item.name, seconds: item.total_seconds, percent: item.percent }));

async function Profile({ params }: Pick<PageProps<'/u/[username]'>, 'params'>) {
	const { username } = await params;
	// Live data: render per request rather than prerendering the profile.
	await Promise.all([connection(), connectMongo()]);
	const view = await publicProfileService.getPageView(decodeURIComponent(username)).catch((error) => {
		if (error instanceof NotFoundException) notFound();
		throw error;
	});
	const { user, stats } = view;
	const initials = initialsOf(user.full_name ?? user.username ?? '?');

	const links = [
		user.website && { href: user.website, icon: Globe, label: user.website.replace(/^https?:\/\//, '') },
		user.github_username && {
			href: `https://github.com/${user.github_username}`,
			icon: GitBranch,
			label: user.github_username,
		},
		user.twitter_username && {
			href: `https://x.com/${user.twitter_username}`,
			icon: AtSign,
			label: user.twitter_username,
		},
		user.linkedin_username && {
			href: `https://www.linkedin.com/in/${user.linkedin_username}`,
			icon: Briefcase,
			label: user.linkedin_username,
		},
	].filter((link): link is { href: string; icon: typeof Globe; label: string } => Boolean(link));

	return (
		<div className="flex flex-col gap-4">
			<section className="tile flex flex-wrap items-center gap-5 p-5.5 sm:p-7">
				<Avatar className="size-18">
					{user.photo ? <AvatarImage src={user.photo} alt="" /> : null}
					<AvatarFallback className="bg-ember/12 text-xl font-semibold text-ember-text">{initials}</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1 basis-60">
					<h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]">
						{user.full_name ?? `@${user.username}`}
						<span className="text-ember">.</span>
					</h1>
					<p className="mt-1 font-mono text-[13px] text-muted-foreground">@{user.username}</p>
					{user.bio ? <p className="mt-2.5 max-w-2xl text-muted-foreground">{user.bio}</p> : null}
					<div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
						{user.city ? (
							<span className="inline-flex items-center gap-1.25">
								<MapPin className="size-3.5" aria-hidden /> {user.city.name}
							</span>
						) : null}
						{links.map(({ href, icon: Icon, label }) => (
							<a
								key={href}
								href={href}
								target="_blank"
								rel="noreferrer nofollow"
								className="inline-flex min-w-0 items-center gap-1.25 transition-colors hover:text-foreground"
							>
								<Icon className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{label}</span>
							</a>
						))}
						{user.is_hireable ? <Tag tone="good">Open to work</Tag> : null}
					</div>
				</div>
			</section>

			{stats && view.heatmap ? (
				<>
					<StatRow>
						<StatTile label="Last 7 days" value={formatDuration(stats.total_seconds_including_other_language)} accent />
						<StatTile label="Daily average" value={formatDuration(stats.daily_average_including_other_language)} />
						<StatTile label="Past year" value={formatDuration(view.yearSeconds)} />
						<StatTile
							label="Top language"
							value={stats.languages[0]?.name ?? '—'}
							hint={stats.is_language_usage_visible ? undefined : 'Private'}
						/>
					</StatRow>

					<Panel label="The last 12 months" tone="ink">
						<ActivityHeatmap days={view.heatmap} />
					</Panel>

					<div className="grid gap-4 md:grid-cols-2">
						{stats.is_language_usage_visible ? (
							<Panel label="Languages" meta="7 days">
								<BreakdownBar items={toBreakdown(stats.languages)} />
							</Panel>
						) : null}
						{stats.is_editor_usage_visible ? (
							<Panel label="Editors" meta="7 days">
								<RankedList items={toBreakdown(stats.editors)} limit={6} />
							</Panel>
						) : null}
						{stats.is_category_usage_visible ? (
							<Panel label="Categories" meta="7 days">
								<RankedList items={toBreakdown(stats.categories)} limit={6} renderName={formatCategory} />
							</Panel>
						) : null}
						{stats.is_os_usage_visible ? (
							<Panel label="Operating systems" meta="7 days">
								<RankedList items={toBreakdown(stats.operating_systems)} limit={4} />
							</Panel>
						) : null}
						{stats.projects.length ? (
							<Panel label="Public projects" meta="7 days" className="md:col-span-2">
								<RankedList
									items={toBreakdown(stats.projects)}
									limit={8}
									colorFor={(name, index) => seriesColor(index, name)}
								/>
							</Panel>
						) : null}
					</div>
				</>
			) : (
				<EmptyState icon={Lock} title="Private activity">
					@{user.username} keeps their coding activity private.
				</EmptyState>
			)}
		</div>
	);
}
