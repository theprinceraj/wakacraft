import { ArrowUpRight, Users } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { Tag } from '@/components/app/chip';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState, PageSkeleton } from '@/components/app/states';
import { CreateOrgButton } from '@/components/orgs/org-actions';
import { requireSession } from '@/lib/auth/session';
import { OrgRoles } from '@/lib/util/Orgs';
import { orgService } from '@/server/org/org.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Teams' };

export default function OrgsPage() {
	return (
		<Suspense fallback={<PageSkeleton stats={false} rows={1} />}>
			<Orgs />
		</Suspense>
	);
}

async function Orgs() {
	const session = await requireSession('/orgs');
	const orgs = await orgService.listOrgs(session.user.id);

	return (
		<>
			<PageHeader
				title="Teams"
				description="Organizations share dashboards of their members' coding time."
				actions={orgs.data.length ? <CreateOrgButton /> : undefined}
			/>
			{orgs.data.length ? (
				<ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{orgs.data.map((org) => (
						<li key={org.id}>
							<Link
								href={`/orgs/${org.id}`}
								className="tile group/card flex h-full min-h-46 flex-col justify-between gap-6 p-6 transition-colors hover:bg-accent"
							>
								<span className="flex items-start justify-between gap-3">
									<Tag tone={org.role === OrgRoles.Owner ? 'ember' : 'neutral'} className="capitalize">
										{org.role}
									</Tag>
									<ArrowUpRight
										className="size-5 text-foreground/70 transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5"
										aria-hidden
									/>
								</span>
								<span className="min-w-0">
									<span className="block truncate text-2xl font-semibold tracking-[-0.03em]">{org.name}</span>
									<span className="mt-1 block text-[13px] text-muted-foreground tabular-nums">
										{org.members_count} member{org.members_count === 1 ? '' : 's'} · {org.dashboards_count} dashboard
										{org.dashboards_count === 1 ? '' : 's'}
									</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<EmptyState icon={Users} title="Bring your team along" action={<CreateOrgButton />}>
					Create a team and share its invite link, or open an invite link someone sent you.
				</EmptyState>
			)}
		</>
	);
}
