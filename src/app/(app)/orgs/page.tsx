import { Users } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { CreateOrgButton } from '@/components/orgs/org-actions';
import { requireSession } from '@/lib/auth/session';
import { orgService } from '@/server/org/org.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Teams' };

export default function OrgsPage() {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Orgs />
		</Suspense>
	);
}

async function Orgs() {
	const session = await requireSession('/orgs');
	const orgs = await orgService.listOrgs(session.user.id);

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-3">
			<div className="flex items-end justify-between">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Teams</h1>
					<p className="text-xs text-muted-foreground">
						Organizations share dashboards of their members&apos; coding time.
					</p>
				</div>
				<CreateOrgButton />
			</div>
			{orgs.data.length ? (
				<ul className="grid gap-2 sm:grid-cols-2">
					{orgs.data.map((org) => (
						<li key={org.id}>
							<Link
								href={`/orgs/${org.id}`}
								className="flex items-center gap-3 rounded-lg border bg-card/80 px-3.5 py-3 hover:border-ember/40"
							>
								<Users className="size-4 text-muted-foreground" aria-hidden />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm">{org.name}</p>
									<p className="tabular text-[11px] text-muted-foreground">
										{org.members_count} member{org.members_count === 1 ? '' : 's'} · {org.dashboards_count} dashboard
										{org.dashboards_count === 1 ? '' : 's'}
									</p>
								</div>
								<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
									{org.role}
								</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-12 text-center text-xs text-muted-foreground">
					<Users className="size-5 text-ember" aria-hidden />
					Create a team and share its invite link, or open an invite link someone sent you.
				</div>
			)}
		</div>
	);
}
