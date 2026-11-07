import { ArrowUpRight, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { chipClass } from '@/components/app/chip';
import { PageHeader } from '@/components/app/page-header';
import { PageSkeleton } from '@/components/app/states';
import { Panel } from '@/components/dashboard/panel';
import { CreateBoardButton } from '@/components/leaderboards/board-actions';
import { LeadersTable } from '@/components/leaderboards/leaders-table';
import { requireSession } from '@/lib/auth/session';
import { formatDuration } from '@/lib/format';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';
import { userProfileService } from '@/server/user/user-profile.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Leaderboards' };

export default function LeaderboardsPage({ searchParams }: PageProps<'/leaderboards'>) {
	return (
		<Suspense fallback={<PageSkeleton stats={false} rows={1} />}>
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
	const me = leaders.data.find((entry) => entry.user.id === session.user.id);

	return (
		<>
			<PageHeader
				title="Leaderboards"
				description="The last 7 days, among developers who made their coding time public."
			/>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
				<div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
					{!profile.loggedTimePublic || !profile.username ? (
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] bg-ember/11 px-5 py-3.5 text-sm">
							<span>You&apos;re not on the public leaderboard yet.</span>
							<Link
								href="/settings#public-profile"
								className="text-[13px] font-medium underline decoration-ember decoration-2 underline-offset-[6px] hover:text-ember-text"
							>
								make your coding time public
							</Link>
						</div>
					) : null}
					<nav className="flex flex-wrap gap-1.5" aria-label="Filter by language">
						<Link
							href="/leaderboards"
							aria-current={!languageFilter ? 'true' : undefined}
							className={chipClass(!languageFilter)}
						>
							All languages
						</Link>
						{languages.map((name) => {
							const on = languageFilter?.toLowerCase() === name.toLowerCase();
							return (
								<Link
									key={name}
									href={`/leaderboards?language=${encodeURIComponent(name)}`}
									aria-current={on ? 'true' : undefined}
									className={chipClass(on)}
								>
									{name}
								</Link>
							);
						})}
					</nav>
					<Panel
						label={languageFilter ?? 'Everyone'}
						description={me ? `You're #${me.rank} with ${formatDuration(me.running_total.total_seconds)}` : undefined}
						meta={<Trophy className="size-5 text-ember-text" aria-hidden />}
						flush
					>
						<LeadersTable leaders={leaders.data} highlightUserId={session.user.id} />
					</Panel>
				</div>

				<aside className="flex min-w-0 flex-col gap-3 lg:col-span-4">
					<div className="flex min-h-8 items-center justify-between gap-3">
						<h2 className="text-lg font-semibold tracking-[-0.025em]">Private boards</h2>
						<CreateBoardButton />
					</div>
					{boards.data.length ? (
						<ul className="flex flex-col gap-2.5">
							{boards.data.map((board) => (
								<li key={board.id}>
									<Link
										href={`/leaderboards/${board.id}`}
										className="tile group/card flex items-start gap-3 px-5.5 py-5 transition-colors hover:bg-accent"
									>
										<span className="min-w-0 flex-1">
											<span className="block truncate font-semibold">{board.name}</span>
											<span className="mt-0.5 block text-[13px] text-muted-foreground tabular-nums">
												{board.members_count} member{board.members_count === 1 ? '' : 's'}
											</span>
										</span>
										<ArrowUpRight
											className="size-5 shrink-0 text-foreground/70 transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5"
											aria-hidden
										/>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<div className="tile flex flex-col items-center gap-3 px-5.5 py-8 text-center">
							<span className="grid size-13 place-items-center rounded-full bg-ember/12 text-ember-text">
								<Users className="size-5.5" aria-hidden />
							</span>
							<p className="text-[13px] text-muted-foreground">
								Compete with your team or friends: create a board and share its invite link.
							</p>
						</div>
					)}
				</aside>
			</div>
		</>
	);
}
