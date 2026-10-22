import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { projectColor, seriesColor } from '@/components/dashboard/colors';
import { DailyChart } from '@/components/dashboard/daily-chart';
import { Donut } from '@/components/dashboard/donut';
import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatTile } from '@/components/dashboard/stat-tile';
import { DashboardDialog } from '@/components/orgs/org-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { formatDay, formatDuration } from '@/lib/format';
import { HttpError } from '@/lib/http/errors';
import { orgService } from '@/server/org/org.service';
import { projectService } from '@/server/project/project.service';

const RANGES = [
	{ value: '7d', label: '7D', days: 7 },
	{ value: '14d', label: '14D', days: 14 },
	{ value: '30d', label: '30D', days: 30 },
	{ value: '90d', label: '90D', days: 90 },
] as const;

export default function TeamDashboardPage({ params, searchParams }: PageProps<'/orgs/[org]/dashboards/[dashboard]'>) {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
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
	const memberColors = Object.fromEntries(view.seriesNames.map((name, index) => [name, seriesColor(index)]));
	const top = view.members[0];

	return (
		<div className="flex flex-col gap-3">
			<Link
				href={`/orgs/${orgId}`}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-3" /> {view.org.name}
			</Link>
			<div className="flex flex-wrap items-end justify-between gap-3 pb-1">
				<div>
					<div className="flex items-center gap-1.5">
						<h1 className="text-lg font-semibold tracking-tight">{view.dashboard.name}</h1>
						{members ? (
							<DashboardDialog
								orgId={orgId}
								dashboard={view.dashboard}
								members={members.data.map((member) => ({
									id: member.id,
									label: member.user.full_name ?? member.user.display_name,
								}))}
								projects={projects.map((project) => project.name)}
								trigger={
									<Button size="icon" variant="ghost" className="size-7" aria-label="Edit dashboard">
										<Pencil />
									</Button>
								}
							/>
						) : null}
					</div>
					<p className="tabular text-xs text-muted-foreground">
						{formatDay(view.range.start)} – {formatDay(view.range.end)}
						<span className="mx-1.5 text-muted-foreground/40">·</span>
						{view.dashboard.projects.length ? view.dashboard.projects.join(', ') : 'All projects'}
					</p>
				</div>
				<RangePicker value={selected.value} options={RANGES} />
			</div>

			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
			</div>

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<Panel label="Daily · by member" className="lg:col-span-8" meta={formatDuration(view.totalSeconds)}>
					{view.totalSeconds > 0 ? (
						<DailyChart daily={view.daily} seriesNames={view.seriesNames} projectColors={memberColors} />
					) : (
						<PanelEmpty />
					)}
				</Panel>
				<Panel label="Languages" className="lg:col-span-4">
					<Donut items={view.languages} />
				</Panel>
			</div>

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<Panel label="Members" className="lg:col-span-7" bodyClassName="p-0">
					<ul className="divide-y">
						{view.members.map((member) => (
							<li
								key={member.id}
								className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2.5"
							>
								<Avatar className="size-7">
									{member.photo ? <AvatarImage src={member.photo} alt="" /> : null}
									<AvatarFallback className="text-[10px]">{member.label.slice(0, 2).toUpperCase()}</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<p className="truncate text-sm">{member.label}</p>
									<p className="truncate text-[11px] text-muted-foreground">
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
								<span className="tabular text-sm">{formatDuration(member.seconds)}</span>
							</li>
						))}
					</ul>
				</Panel>
				<Panel label="Projects" className="lg:col-span-5" meta={`${view.projects.length} total`}>
					<RankedList items={view.projects} limit={10} colorFor={(name, index) => projectColor(name, index, {})} />
				</Panel>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				<Panel label="Editors">
					<RankedList items={view.editors} limit={6} colorFor={() => 'var(--chart-3)'} />
				</Panel>
				<Panel label="Categories">
					<RankedList items={view.categories} limit={6} colorFor={(_name, index) => seriesColor(index + 1)} />
				</Panel>
			</div>
		</div>
	);
}
