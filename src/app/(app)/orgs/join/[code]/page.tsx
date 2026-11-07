import { LogOut } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { InviteCard } from '@/components/app/invite-card';
import { JoinOrgButton } from '@/components/orgs/org-actions';
import { requireSession } from '@/lib/auth/session';
import { orgService } from '@/server/org/org.service';

/** Invite landing page. Joining is an explicit click, since it shares your coding time with the team. */
export default function JoinOrgPage({ params }: PageProps<'/orgs/join/[code]'>) {
	return (
		<Suspense fallback={null}>
			<Join params={params} />
		</Suspense>
	);
}

async function Join({ params }: Pick<PageProps<'/orgs/join/[code]'>, 'params'>) {
	const { code } = await params;
	await requireSession(`/orgs/join/${code}`);
	const org = await orgService.previewInvite(code);
	if (!org) notFound();

	return (
		<InviteCard
			name={org.name}
			kind="A team on wakacraft."
			points={[
				{ text: "The team's dashboards will show your coding time" },
				{ text: 'That includes your projects, languages and editors' },
				{ text: 'You can leave at any time', icon: LogOut },
			]}
			join={<JoinOrgButton code={code} />}
			cancelHref="/orgs"
		/>
	);
}
