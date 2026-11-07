import { Pencil } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { PageSkeleton } from '@/components/app/states';
import { BreakdownBar } from '@/components/dashboard/breakdown-bar';
import { projectColor, seriesColor } from '@/components/dashboard/colors';
import { DailyChart } from '@/components/dashboard/daily-chart';
import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatRow, StatTile } from '@/components/dashboard/stat-tile';
import { DashboardDialog } from '@/components/orgs/org-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { formatCategory, formatDay, formatDuration, initialsOf } from '@/lib/format';
import { HttpError } from '@/lib/http/errors';
import { orgService } from '@/server/org/org.service';
import { projectService } from '@/server/project/project.service';

const RANGES = [
	{ value: '7d', label: '7 days', days: 7 },
	{ value: '14d', label: '14 days', days: 14 },
	{ value: '30d', label: '30 days', days: 30 },
	{ value: '90d', label: '90 days', days: 90 },
] as const;

export default function TeamDashboardPage({ params, searchParams }: PageProps<'/orgs/[org]/dashboards/[dashboard]'>) {
	return (
		<Suspense fallback={<PageSkeleton />}>
			<TeamDashboard params={params} searchParams={searchParams} />
		</Suspense>
	);
}

async function TeamDashboard({ params, searchParams }: PageProps<'/orgs/[org]/dashboards/[dashboard]'>) {
	const session = await requireSession('/orgs');
	const [{ org: orgId, dashboard: dashboardId }, { range }] = await Promise.all([params, searchParams]);
	const selected = RANGES.find((option) => option.value === range) ?? RANGES[0];

	const view = await orgService.getTeamView(session.user.id, orgId, dashboardId, selected.days).catch((error) => {
		if (error instanceof HttpError && (error.status === 404 || error.status === 403)) notFound();
		throw error;
	});
	const [members, projects] = view.org.can_manage
		? await Promise.all([orgService.listMembers(session.user.id, orgId), projectService.list(session.user.id)])
		: [null, []];

	// Member series get the palette in rank order; there are no per-member colors to honour.
	const memberColors = Object.fromEntries(view.seriesNames.map((name, index) => [name, seriesColor(index, name)]));
	const top = view.members[0];

	return (
		<>
			<PageHeader
				back={{ href: `/orgs/${orgId}`, label: view.org.name }}
				title={view.dashboard.name}
				titleAction={
					members ? (
						<DashboardDialog
							orgId={orgId}
							dashboard={view.dashboard}
							members={members.data.map((member) => ({
								id: member.id,
								label: member.user.full_name ?? member.user.display_name,
							}))}
							projects={projects.map((project) => project.name)}
							trigger={
								<Button size="icon" variant="ghost" className="text-muted-foreground" aria-label="Edit dashboard">
									<Pencil />
								</Button>
							}
						/>
					) : null
				}
				description={
					<span className="font-mono text-[13px]">
						{formatDay(view.range.start)} – {formatDay(view.range.end)} ·{' '}
						{view.dashboard.projects.length ? view.dashboard.projects.join(', ') : 'All projects'}
					</span>
				}
				actions={<RangePicker value={selected.value} options={RANGES} />}
			/>

			<div className="flex flex-col gap-4">
				<StatRow>
					<StatTile
						label="Team total"
						value={formatDuration(view.totalSeconds)}
						hint={`Last ${view.range.days} days`}
						accent
					/>
					<StatTile
						label="Per member"
						value={formatDuration(view.activeMembers ? view.totalSeconds / view.activeMembers : 0)}
						hint="Average of active members"
					/>
					<StatTile
						label="Active members"
						value={`${view.activeMembers} / ${view.members.length}`}
						hint="Coded at least once"
					/>
					<StatTile
						label="Most active"
						value={top && top.seconds > 0 ? top.label : '—'}
						hint={top && top.seconds > 0 ? formatDuration(top.seconds) : 'No activity yet'}
					/>
				</StatRow>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<Panel
						label="Time by member"
						description={`${formatDuration(view.totalSeconds)} in total`}
						className="lg:col-span-8"
					>
						{view.totalSeconds > 0 ? (
							<DailyChart daily={view.daily} seriesNames={view.seriesNames} projectColors={memberColors} />
						) : (
							<PanelEmpty />
						)}
					</Panel>
					<Panel label="Languages" className="lg:col-span-4">
						<BreakdownBar items={view.languages} />
					</Panel>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<Panel label="Members" className="lg:col-span-7" flush>
						<ul className="divide-y border-t">
							{view.members.map((member) => (
								<li key={member.id} className="flex items-center gap-3 px-5.5 py-3 sm:px-7">
									<Avatar className="size-8">
										{member.photo ? <AvatarImage src={member.photo} alt="" /> : null}
										<AvatarFallback className="bg-accent text-[11px] font-semibold">
											{initialsOf(member.label)}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">{member.label}</p>
										<p className="truncate text-xs text-muted-foreground">
											{member.seconds > 0
												? [
														`${member.activeDays} active day${member.activeDays === 1 ? '' : 's'}`,
														member.topLanguage,
														member.topProject,
													]
														.filter(Boolean)
														.join(' · ')
												: 'No activity in this range'}
										</p>
									</div>
									<span className="font-semibold tabular-nums">{formatDuration(member.seconds)}</span>
								</li>
							))}
						</ul>
					</Panel>
					<Panel label="Projects" meta={`${view.projects.length} total`} className="lg:col-span-5">
						<RankedList items={view.projects} limit={8} colorFor={(name, index) => projectColor(name, index, {})} />
					</Panel>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Panel label="Editors">
						<RankedList items={view.editors} limit={6} />
					</Panel>
					<Panel label="Categories">
						<RankedList items={view.categories} limit={6} renderName={formatCategory} />
					</Panel>
				</div>
			</div>
		</>
	);
}
