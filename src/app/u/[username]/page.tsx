import { AtSign, Briefcase, GitBranch, Globe, Lock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { Logo } from '@/components/app/logo';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { seriesColor } from '@/components/dashboard/colors';
import { Donut } from '@/components/dashboard/donut';
import { Panel } from '@/components/dashboard/panel';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatTile } from '@/components/dashboard/stat-tile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotFoundException } from '@/lib/http/errors';
import { connectMongo } from '@/lib/mongo/connection';
import { formatDuration } from '@/lib/format';
import { publicProfileService } from '@/server/user/public-profile.service';

import type { StatItem } from '@/server/stats/stats.response.dto';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: PageProps<'/u/[username]'>): Promise<Metadata> {
	const { username } = await params;
	return { title: `@${decodeURIComponent(username)}` };
}

export default function PublicProfilePage({ params }: PageProps<'/u/[username]'>) {
	return (
		<div className="canvas-grid flex min-h-full flex-1 flex-col">
			<header className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between px-4">
				<Link href="/" className="text-foreground">
					<Logo />
				</Link>
				<Link href="/signup" className="text-xs text-muted-foreground hover:text-foreground">
					Track your own coding time →
				</Link>
			</header>
			<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
				<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
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
	const initials = (user.full_name ?? user.username ?? '?')
		.split(/\s+/)
		.map((word) => word[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

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
			<section className="flex flex-wrap items-center gap-4 rounded-lg border bg-card/80 p-5">
				<Avatar className="size-16">
					{user.photo ? <AvatarImage src={user.photo} alt="" /> : null}
					<AvatarFallback className="bg-ember/15 text-lg text-ember">{initials}</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<h1 className="text-xl font-semibold tracking-tight">{user.full_name ?? `@${user.username}`}</h1>
					<p className="tabular text-xs text-muted-foreground">@{user.username}</p>
					{user.bio ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{user.bio}</p> : null}
					<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
						{user.city ? (
							<span className="inline-flex items-center gap-1">
								<MapPin className="size-3" /> {user.city.name}
							</span>
						) : null}
						{links.map(({ href, icon: Icon, label }) => (
							<a
								key={href}
								href={href}
								target="_blank"
								rel="noreferrer nofollow"
								className="inline-flex items-center gap-1 hover:text-foreground"
							>
								<Icon className="size-3" /> {label}
							</a>
						))}
						{user.is_hireable ? (
							<span className="rounded-full bg-success/15 px-2 py-0.5 text-success">Open to work</span>
						) : null}
					</div>
				</div>
			</section>

			{stats && view.heatmap ? (
				<>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						<StatTile label="Last 7 days" value={formatDuration(stats.total_seconds_including_other_language)} accent />
						<StatTile label="Daily average" value={formatDuration(stats.daily_average_including_other_language)} />
						<StatTile label="Past year" value={formatDuration(view.yearSeconds)} />
						<StatTile
							label="Top language"
							value={stats.languages[0]?.name ?? '—'}
							hint={stats.is_language_usage_visible ? undefined : 'Private'}
						/>
					</div>

					<Panel label="Activity · 12 months">
						<ActivityHeatmap days={view.heatmap} />
					</Panel>

					<div className="grid gap-3 md:grid-cols-2">
						{stats.is_language_usage_visible ? (
							<Panel label="Languages · 7 days">
								<Donut items={toBreakdown(stats.languages)} />
							</Panel>
						) : null}
						{stats.is_editor_usage_visible ? (
							<Panel label="Editors · 7 days">
								<Donut items={toBreakdown(stats.editors)} />
							</Panel>
						) : null}
						{stats.is_category_usage_visible ? (
							<Panel label="Categories · 7 days">
								<RankedList items={toBreakdown(stats.categories)} limit={6} colorFor={(_n, i) => seriesColor(i)} />
							</Panel>
						) : null}
						{stats.is_os_usage_visible ? (
							<Panel label="Operating systems · 7 days">
								<RankedList items={toBreakdown(stats.operating_systems)} limit={4} colorFor={() => 'var(--chart-3)'} />
							</Panel>
						) : null}
						{stats.projects.length ? (
							<Panel label="Public projects · 7 days" className="md:col-span-2">
								<RankedList items={toBreakdown(stats.projects)} limit={8} colorFor={(_n, i) => seriesColor(i)} />
							</Panel>
						) : null}
					</div>
				</>
			) : (
				<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card/40 px-6 py-14 text-center">
					<Lock className="size-5 text-muted-foreground" aria-hidden />
					<p className="text-sm">@{user.username} keeps their coding activity private.</p>
				</div>
			)}
		</div>
	);
}
