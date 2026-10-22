import { Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

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
		<div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-lg border bg-card/80 px-6 py-10 text-center">
			<Users className="size-6 text-ember" aria-hidden />
			<div>
				<h1 className="text-lg font-semibold tracking-tight">Join “{org.name}”</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					The team&apos;s dashboards will show your coding time: projects, languages and editors. You can leave at any
					time.
				</p>
			</div>
			<JoinOrgButton code={code} />
		</div>
	);
}
