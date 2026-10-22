import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Panel } from '@/components/dashboard/panel';
import { InviteLink, LeaveBoardButton } from '@/components/leaderboards/board-actions';
import { LeadersTable } from '@/components/leaderboards/leaders-table';
import { requireSession } from '@/lib/auth/session';
import { getBaseUrl } from '@/lib/base-url';
import { HttpError } from '@/lib/http/errors';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';

export default function BoardPage({ params }: PageProps<'/leaderboards/[board]'>) {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Board params={params} />
		</Suspense>
	);
}

async function Board({ params }: Pick<PageProps<'/leaderboards/[board]'>, 'params'>) {
	const session = await requireSession('/leaderboards');
	const { board: boardId } = await params;
	const [leaders, baseUrl] = await Promise.all([
		leaderboardService.boardLeaders(session.user.id, boardId, { page: 1 }).catch((error) => {
			// Unknown boards and boards you aren't in look the same from outside.
			if (error instanceof HttpError && (error.status === 404 || error.status === 403)) notFound();
			throw error;
		}),
		getBaseUrl(),
	]);
	const { board } = leaders;

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-3">
			<Link
				href="/leaderboards"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-3" /> Leaderboards
			</Link>
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">{board.name}</h1>
					<p className="text-xs text-muted-foreground">Private · last 7 days</p>
				</div>
				<LeaveBoardButton boardId={board.id} isOwner={board.can_delete} />
			</div>
			<InviteLink url={`${baseUrl}/leaderboards/join/${board.invite_code}`} />
			<Panel label="Members" bodyClassName="p-0">
				<LeadersTable leaders={leaders.data} highlightUserId={session.user.id} />
			</Panel>
		</div>
	);
}
