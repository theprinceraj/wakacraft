import { Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { JoinBoardButton } from '@/components/leaderboards/board-actions';
import { requireSession } from '@/lib/auth/session';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';

/** Invite landing page. Joining is an explicit click, since it shares your coding time with the members. */
export default function JoinPage({ params }: PageProps<'/leaderboards/join/[code]'>) {
	return (
		<Suspense fallback={null}>
			<Join params={params} />
		</Suspense>
	);
}

async function Join({ params }: Pick<PageProps<'/leaderboards/join/[code]'>, 'params'>) {
	const { code } = await params;
	await requireSession(`/leaderboards/join/${code}`);
	const board = await leaderboardService.previewInvite(code);
	if (!board) notFound();

	return (
		<div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-lg border bg-card/80 px-6 py-10 text-center">
			<Users className="size-6 text-ember" aria-hidden />
			<div>
				<h1 className="text-lg font-semibold tracking-tight">Join “{board.name}”</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Members of this leaderboard will see your coding time and languages for the last 7 days.
				</p>
			</div>
			<JoinBoardButton code={code} />
		</div>
	);
}
