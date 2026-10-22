import { ArrowLeft, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Panel } from '@/components/dashboard/panel';
import { InviteLink } from '@/components/leaderboards/board-actions';
import {
	DashboardDialog,
	LeaveOrgButton,
	MemberControls,
	RegenerateInviteButton,
	RenameOrgButton,
} from '@/components/orgs/org-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { getBaseUrl } from '@/lib/base-url';
import { HttpError } from '@/lib/http/errors';
import { OrgRoles } from '@/lib/util/Orgs';
import { orgService } from '@/server/org/org.service';
import { projectService } from '@/server/project/project.service';

export default function OrgPage({ params }: PageProps<'/orgs/[org]'>) {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Org params={params} />
		</Suspense>
	);
}

async function Org({ params }: Pick<PageProps<'/orgs/[org]'>, 'params'>) {
	const session = await requireSession('/orgs');
	const { org: orgId } = await params;
	const [org, dashboards, members, projects, baseUrl] = await Promise.all([
		orgService.getOrg(session.user.id, orgId),
		orgService.listDashboards(session.user.id, orgId),
		orgService.listMembers(session.user.id, orgId),
		projectService.list(session.user.id),
		getBaseUrl(),
	]).catch((error) => {
		// Unknown orgs and orgs you aren't in look the same from outside.
		if (error instanceof HttpError && (error.status === 404 || error.status === 403)) notFound();
		throw error;
	});
	const { data } = org;
	const memberOptions = members.data.map((member) => ({
		id: member.id,
		label: member.user.full_name ?? member.user.display_name,
	}));
	const projectNames = projects.map((project) => project.name);
	const canEdit = (role: string, userId: string) =>
		data.can_manage &&
		userId !== session.user.id &&
		role !== OrgRoles.Owner &&
		(role !== OrgRoles.Admin || data.is_owner);

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-4">
			<Link href="/orgs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
				<ArrowLeft className="size-3" /> Teams
			</Link>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold tracking-tight">{data.name}</h1>
					{data.can_manage ? <RenameOrgButton orgId={data.id} name={data.name} /> : null}
					<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
						{data.role}
					</span>
				</div>
				<LeaveOrgButton orgId={data.id} isOwner={data.is_owner} />
			</div>

			{data.invite_code ? (
				<Panel label="Invite link" meta={<RegenerateInviteButton orgId={data.id} />}>
					<InviteLink url={`${baseUrl}/orgs/join/${data.invite_code}`} />
				</Panel>
			) : null}

			<div className="grid gap-4 lg:grid-cols-12">
				<div className="flex flex-col gap-3 lg:col-span-7">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-medium">Dashboards</h2>
						{data.can_manage ? (
							<DashboardDialog
								orgId={data.id}
								members={memberOptions}
								projects={projectNames}
								trigger={
									<Button size="sm" variant="outline">
										<Plus /> New dashboard
									</Button>
								}
							/>
						) : null}
					</div>
					{dashboards.data.length ? (
						<ul className="flex flex-col gap-2">
							{dashboards.data.map((dashboard) => (
								<li key={dashboard.id}>
									<Link
										href={`/orgs/${data.id}/dashboards/${dashboard.id}`}
										className="flex items-center gap-3 rounded-lg border bg-card/80 px-3.5 py-3 hover:border-ember/40"
									>
										<LayoutDashboard className="size-4 text-muted-foreground" aria-hidden />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm">{dashboard.name}</p>
											<p className="truncate text-[11px] text-muted-foreground">
												{dashboard.member_ids.length ? `${dashboard.members_count} members` : 'Everyone'} ·{' '}
												{dashboard.projects.length ? dashboard.projects.join(', ') : 'all projects'}
											</p>
										</div>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
							No dashboards yet.
						</p>
					)}
				</div>

				<Panel label={`${members.total} members`} className="lg:col-span-5" bodyClassName="p-0">
					<ul className="divide-y">
						{members.data.map((member) => (
							<li key={member.id} className="flex items-center gap-3 px-3.5 py-2.5">
								<Avatar className="size-7">
									{member.user.photo ? <AvatarImage src={member.user.photo} alt="" /> : null}
									<AvatarFallback className="text-[10px]">
										{(member.user.full_name ?? member.user.display_name).slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm">
										{member.user.full_name ?? member.user.display_name}
										{member.id === session.user.id ? <span className="text-muted-foreground"> · you</span> : null}
									</p>
									<p className="truncate text-[11px] text-muted-foreground">
										{member.user.email ?? (member.user.username ? `@${member.user.username}` : '')}
									</p>
								</div>
								{canEdit(member.role, member.id) ? (
									<MemberControls orgId={data.id} userId={member.id} role={member.role} />
								) : (
									<span className="text-[11px] capitalize text-muted-foreground">{member.role}</span>
								)}
							</li>
						))}
					</ul>
				</Panel>
			</div>
		</div>
	);
}
