import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { PageSkeleton } from '@/components/app/states';
import { Panel } from '@/components/dashboard/panel';
import { InviteLink, LeaveBoardButton } from '@/components/leaderboards/board-actions';
import { LeadersTable } from '@/components/leaderboards/leaders-table';
import { requireSession } from '@/lib/auth/session';
import { getBaseUrl } from '@/lib/base-url';
import { HttpError } from '@/lib/http/errors';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';

export default function BoardPage({ params }: PageProps<'/leaderboards/[board]'>) {
	return (
		<Suspense fallback={<PageSkeleton stats={false} rows={1} />}>
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
	const me = leaders.data.find((entry) => entry.user.id === session.user.id);

	return (
		<div className="mx-auto max-w-3xl">
			<PageHeader
				back={{ href: '/leaderboards', label: 'Leaderboards' }}
				title={board.name}
				description={`Private · last 7 days${me ? ` · you're #${me.rank} of ${board.members_count}` : ''}`}
				actions={<LeaveBoardButton boardId={board.id} isOwner={board.can_delete} />}
			/>
			<div className="flex flex-col gap-4">
				<Panel
					label="Invite people"
					description="Anyone with this link can join and see members' coding time and languages."
					tone="ink"
				>
					<InviteLink url={`${baseUrl}/leaderboards/join/${board.invite_code}`} />
				</Panel>
				<Panel label="Members" meta={board.members_count} flush>
					<LeadersTable leaders={leaders.data} highlightUserId={session.user.id} />
				</Panel>
			</div>
		</div>
	);
}
