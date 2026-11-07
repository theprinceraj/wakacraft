import { ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Tag } from '@/components/app/chip';
import { PageHeader } from '@/components/app/page-header';
import { PageSkeleton } from '@/components/app/states';
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
import { initialsOf } from '@/lib/format';
import { HttpError } from '@/lib/http/errors';
import { OrgRoles } from '@/lib/util/Orgs';
import { orgService } from '@/server/org/org.service';
import { projectService } from '@/server/project/project.service';

export default function OrgPage({ params }: PageProps<'/orgs/[org]'>) {
	return (
		<Suspense fallback={<PageSkeleton stats={false} rows={1} />}>
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
		<div className="mx-auto max-w-5xl">
			<PageHeader
				back={{ href: '/orgs', label: 'Teams' }}
				title={data.name}
				titleAction={data.can_manage ? <RenameOrgButton orgId={data.id} name={data.name} /> : null}
				description={
					<span className="flex flex-wrap items-center gap-2 text-sm">
						<Tag tone={data.role === OrgRoles.Owner ? 'ember' : 'neutral'} className="capitalize">
							{data.role}
						</Tag>
						{members.total} member{members.total === 1 ? '' : 's'} · {dashboards.data.length} dashboard
						{dashboards.data.length === 1 ? '' : 's'}
					</span>
				}
				actions={<LeaveOrgButton orgId={data.id} isOwner={data.is_owner} />}
			/>

			<div className="flex flex-col gap-4">
				{data.invite_code ? (
					<Panel
						label="Invite link"
						description="Anyone with this link can join the team."
						tone="ink"
						meta={<RegenerateInviteButton orgId={data.id} />}
					>
						<InviteLink url={`${baseUrl}/orgs/join/${data.invite_code}`} />
					</Panel>
				) : null}

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<div className="flex min-w-0 flex-col gap-3 lg:col-span-7">
						<div className="flex min-h-8 items-center justify-between gap-3">
							<h2 className="text-lg font-semibold tracking-[-0.025em]">Dashboards</h2>
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
							<ul className="flex flex-col gap-2.5">
								{dashboards.data.map((dashboard) => (
									<li key={dashboard.id}>
										<Link
											href={`/orgs/${data.id}/dashboards/${dashboard.id}`}
											className="tile group/card flex items-start gap-3 p-5.5 transition-colors hover:bg-accent"
										>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-base font-semibold">{dashboard.name}</span>
												<span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
													{dashboard.member_ids.length ? `${dashboard.members_count} members` : 'Everyone'} ·{' '}
													{dashboard.projects.length ? dashboard.projects.join(', ') : 'all projects'}
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
							<p className="tile px-5 py-8 text-center text-[13px] text-muted-foreground">
								No dashboards yet.{data.can_manage ? ' Create one to see the team’s time together.' : ''}
							</p>
						)}
					</div>

					<Panel label="Members" meta={members.total} className="lg:col-span-5" flush>
						<ul className="divide-y border-t">
							{members.data.map((member) => (
								<li key={member.id} className="flex items-center gap-3 px-5.5 py-3">
									<Avatar className="size-8">
										{member.user.photo ? <AvatarImage src={member.user.photo} alt="" /> : null}
										<AvatarFallback className="bg-accent text-[11px] font-semibold">
											{initialsOf(member.user.full_name ?? member.user.display_name)}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">
											{member.user.full_name ?? member.user.display_name}
											{member.id === session.user.id ? (
												<span className="font-normal text-muted-foreground"> · you</span>
											) : null}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{member.user.email ?? (member.user.username ? `@${member.user.username}` : '')}
										</p>
									</div>
									{canEdit(member.role, member.id) ? (
										<MemberControls
											orgId={data.id}
											userId={member.id}
											role={member.role}
											name={member.user.full_name ?? member.user.display_name}
										/>
									) : (
										<Tag tone={member.role === OrgRoles.Owner ? 'ember' : 'neutral'} className="capitalize">
											{member.role}
										</Tag>
									)}
								</li>
							))}
						</ul>
					</Panel>
				</div>
			</div>
		</div>
	);
}
