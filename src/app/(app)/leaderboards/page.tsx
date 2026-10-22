import { Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { Panel } from '@/components/dashboard/panel';
import { CreateBoardButton } from '@/components/leaderboards/board-actions';
import { LeadersTable } from '@/components/leaderboards/leaders-table';
import { requireSession } from '@/lib/auth/session';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';
import { userProfileService } from '@/server/user/user-profile.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Leaderboards' };

export default function LeaderboardsPage({ searchParams }: PageProps<'/leaderboards'>) {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Leaderboards searchParams={searchParams} />
		</Suspense>
	);
}

async function Leaderboards({ searchParams }: Pick<PageProps<'/leaderboards'>, 'searchParams'>) {
	const session = await requireSession('/leaderboards');
	const { language } = await searchParams;
	const languageFilter = typeof language === 'string' && language ? language : undefined;
	const [leaders, boards, profile] = await Promise.all([
		leaderboardService.publicLeaders({ language: languageFilter, page: 1 }),
		leaderboardService.listBoards(session.user.id),
		userProfileService.getProfile(session.user.id),
	]);
	const languages = [
		...new Set(leaders.data.flatMap((entry) => entry.running_total.languages.map((item) => item.name))),
	].slice(0, 10);

	return (
		<div className="grid gap-4 lg:grid-cols-12">
			<div className="flex flex-col gap-3 lg:col-span-8">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 className="text-lg font-semibold tracking-tight">Leaderboards</h1>
						<p className="text-xs text-muted-foreground">Last 7 days · developers who made their coding time public.</p>
					</div>
					<nav className="flex flex-wrap gap-1 text-xs">
						<Link
							href="/leaderboards"
							className={`rounded-full border px-2.5 py-0.5 ${!languageFilter ? 'border-ember/60 text-ember' : 'text-muted-foreground'}`}
						>
							All languages
						</Link>
						{languages.map((name) => (
							<Link
								key={name}
								href={`/leaderboards?language=${encodeURIComponent(name)}`}
								className={`rounded-full border px-2.5 py-0.5 ${languageFilter?.toLowerCase() === name.toLowerCase() ? 'border-ember/60 text-ember' : 'text-muted-foreground'}`}
							>
								{name}
							</Link>
						))}
					</nav>
				</div>
				{!profile.loggedTimePublic || !profile.username ? (
					<p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
						You&apos;re not on the public leaderboard.{' '}
						<Link href="/settings#public-profile" className="text-ember hover:underline">
							Set a username and make your coding time public
						</Link>{' '}
						to join.
					</p>
				) : null}
				<Panel
					label={languageFilter ? `Public · ${languageFilter}` : 'Public'}
					bodyClassName="p-0"
					meta={<Trophy className="size-3.5 text-ember" />}
				>
					<LeadersTable leaders={leaders.data} highlightUserId={session.user.id} />
				</Panel>
			</div>

			<div className="flex flex-col gap-3 lg:col-span-4">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-medium">Private leaderboards</h2>
					<CreateBoardButton />
				</div>
				{boards.data.length ? (
					<ul className="flex flex-col gap-2">
						{boards.data.map((board) => (
							<li key={board.id}>
								<Link
									href={`/leaderboards/${board.id}`}
									className="flex items-center gap-3 rounded-lg border bg-card/80 px-3.5 py-3 hover:border-ember/40"
								>
									<Users className="size-4 text-muted-foreground" aria-hidden />
									<span className="min-w-0 flex-1 truncate text-sm">{board.name}</span>
									<span className="tabular text-xs text-muted-foreground">{board.members_count}</span>
								</Link>
							</li>
						))}
					</ul>
				) : (
					<p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
						Compete with your team or friends: create one and share the invite link.
					</p>
				)}
			</div>
		</div>
	);
}
