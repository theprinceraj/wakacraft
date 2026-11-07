import { Lock, LogOut } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { InviteCard } from '@/components/app/invite-card';
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
		<InviteCard
			name={board.name}
			kind="A private leaderboard."
			points={[
				{ text: 'Members will see your coding time for the last 7 days' },
				{ text: "They'll also see the languages you used" },
				{ text: 'Project names and files stay private', icon: Lock },
				{ text: 'You can leave at any time', icon: LogOut },
			]}
			join={<JoinBoardButton code={code} />}
			cancelHref="/leaderboards"
		/>
	);
}
