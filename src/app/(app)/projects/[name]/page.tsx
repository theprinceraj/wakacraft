import { ExternalLink, GitCommitHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { EmptyState, PageSkeleton } from '@/components/app/states';
import { BreakdownBar } from '@/components/dashboard/breakdown-bar';
import { DailyChart } from '@/components/dashboard/daily-chart';
import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatRow, StatTile } from '@/components/dashboard/stat-tile';
import { ProjectCommits } from '@/components/projects/project-commits';
import { ProjectSettings } from '@/components/projects/project-settings';
import { ProjectTabs } from '@/components/projects/project-tabs';
import { requireSession } from '@/lib/auth/session';
import { formatCategory, formatDay, formatDuration, formatRangeLabel } from '@/lib/format';
import { NotFoundException } from '@/lib/http/errors';
import { localDateOf } from '@/lib/util/Time';
import { isDashboardRange } from '@/server/dashboard/dashboard.service';
import { projectDetailService } from '@/server/project/project-detail.service';
import { statsService } from '@/server/stats/stats.service';

export default function ProjectPage(props: PageProps<'/projects/[name]'>) {
	return (
		<Suspense fallback={<PageSkeleton />}>
			<Project {...props} />
		</Suspense>
	);
}

/** File entities are absolute paths; show the file name with its parent folder for context. */
function FileName({ path }: { path: string }) {
	const parts = path.split(/[\\/]/).filter(Boolean);
	const file = parts.at(-1) ?? path;
	const folder = parts.slice(-3, -1).join('/');
	return (
		<>
			<span>{file}</span>
			{folder ? <span className="ml-1.5 text-[12.5px] text-muted-foreground">{folder}</span> : null}
		</>
	);
}

async function Project({ params, searchParams }: PageProps<'/projects/[name]'>) {
	const session = await requireSession();
	const [{ name }, query] = await Promise.all([params, searchParams]);
	const slug = isDashboardRange(query.range) ? query.range : '30d';

	const [view, settings] = await Promise.all([
		projectDetailService.getView(session.user.id, decodeURIComponent(name), slug).catch((error) => {
			if (error instanceof NotFoundException) notFound();
			throw error;
		}),
		statsService.resolveSettings(session.user.id),
	]);
	const { project, totals } = view;
	const localDate = (date: Date) => localDateOf(date.getTime() / 1000, settings.timezone);

	return (
		<>
			<PageHeader
				back={{ href: '/projects', label: 'Projects' }}
				title={project.name}
				description={
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
						<span className="flex items-center gap-1.75">
							<span className="size-2.5 rounded-[3px]" style={{ background: project.color ?? 'var(--chart-1)' }} />
							{formatDay(view.range.start)} – {formatDay(view.range.end)}
						</span>
						{project.repository ? (
							<a
								href={project.repository}
								target="_blank"
								rel="noreferrer"
								className="inline-flex max-w-full items-center gap-1 font-medium text-foreground underline decoration-ember decoration-2 underline-offset-[5px] hover:text-ember-text"
							>
								<span className="truncate">{project.repository.replace(/^https?:\/\//, '')}</span>
								<ExternalLink className="size-3 shrink-0" aria-hidden />
							</a>
						) : null}
					</div>
				}
				className="mb-5"
			/>

			<ProjectTabs
				range={<RangePicker value={slug} />}
				overview={
					<div className="flex flex-col gap-4">
						<StatRow>
							<StatTile label={formatRangeLabel(view.range.label)} value={formatDuration(totals.seconds)} accent />
							<StatTile
								label="Daily average"
								value={formatDuration(totals.dailyAverageSeconds)}
								hint={`${totals.activeDays} of ${view.range.days} days active`}
							/>
							<StatTile
								label="Top branch"
								value={<span className="text-[clamp(1.125rem,2vw,1.375rem)]">{view.branches[0]?.name ?? '—'}</span>}
								hint={view.branches[0] ? formatDuration(view.branches[0].seconds) : undefined}
							/>
							<StatTile
								label="Tracked since"
								value={formatDay(localDate(project.firstHeartbeatAt), { month: 'short', year: 'numeric' })}
								hint={`Last active ${formatDay(localDate(project.lastHeartbeatAt))}`}
							/>
						</StatRow>

						<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
							<Panel
								label="Time by language"
								description={`${formatDuration(totals.seconds)} in total`}
								className="lg:col-span-8"
							>
								{totals.seconds === 0 ? (
									<PanelEmpty />
								) : view.range.days === 1 ? (
									<BreakdownBar items={view.languages} barClassName="h-3" />
								) : (
									<DailyChart daily={view.daily} seriesNames={view.seriesNames} projectColors={{}} />
								)}
							</Panel>
							<Panel label="Languages" className="lg:col-span-4">
								<BreakdownBar items={view.languages} />
							</Panel>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
							<Panel label="Files" meta={`${view.files.length} files`} className="md:col-span-2 lg:col-span-6">
								<RankedList items={view.files} limit={8} renderName={(path) => <FileName path={path} />} />
							</Panel>
							<Panel label="Branches" className="lg:col-span-3">
								<RankedList items={view.branches} limit={6} />
							</Panel>
							<Panel label="Categories" className="lg:col-span-3">
								<RankedList items={view.categories} limit={6} renderName={formatCategory} />
							</Panel>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Panel label="Editors">
								<RankedList items={view.editors} limit={6} />
							</Panel>
							<Panel label="Machines">
								<RankedList items={view.machines} limit={6} />
							</Panel>
						</div>
					</div>
				}
				commits={
					project.repository ? (
						<Panel label="Commits" description="Your coding time since the previous commit." flush>
							<ProjectCommits project={project.name} />
						</Panel>
					) : (
						<EmptyState icon={GitCommitHorizontal} title="See the time behind each commit">
							Add this project&apos;s GitHub repository URL under Settings to turn this on.
						</EmptyState>
					)
				}
				settings={
					<Panel label="Project settings" className="max-w-170">
						<ProjectSettings
							projectId={project.id}
							color={project.color ?? null}
							repository={project.repository ?? null}
							isPublic={project.hasPublicUrl}
						/>
					</Panel>
				}
			/>
		</>
	);
}
