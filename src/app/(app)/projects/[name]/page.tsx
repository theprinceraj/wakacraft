import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { seriesColor } from '@/components/dashboard/colors';
import { DailyChart } from '@/components/dashboard/daily-chart';
import { Donut } from '@/components/dashboard/donut';
import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatTile } from '@/components/dashboard/stat-tile';
import { ProjectCommits } from '@/components/projects/project-commits';
import { ProjectSettings } from '@/components/projects/project-settings';
import { requireSession } from '@/lib/auth/session';
import { NotFoundException } from '@/lib/http/errors';
import { formatDay, formatDuration } from '@/lib/format';
import { isDashboardRange } from '@/server/dashboard/dashboard.service';
import { projectDetailService } from '@/server/project/project-detail.service';

export default function ProjectPage(props: PageProps<'/projects/[name]'>) {
	return (
		<Suspense fallback={<div className="h-[600px] animate-pulse rounded-lg border bg-card/50" />}>
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
			{folder ? <span className="ml-1.5 text-muted-foreground/60">{folder}</span> : null}
		</>
	);
}

async function Project({ params, searchParams }: PageProps<'/projects/[name]'>) {
	const session = await requireSession();
	const [{ name }, query] = await Promise.all([params, searchParams]);
	const slug = isDashboardRange(query.range) ? query.range : '30d';

	const view = await projectDetailService.getView(session.user.id, decodeURIComponent(name), slug).catch((error) => {
		if (error instanceof NotFoundException) notFound();
		throw error;
	});
	const { project, totals } = view;
	const languageColor = (_name: string, index: number) => seriesColor(index);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-end justify-between gap-3 pb-1">
				<div className="min-w-0">
					<Link
						href="/projects"
						className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-3" /> Projects
					</Link>
					<h1 className="flex items-center gap-2 truncate text-lg font-semibold tracking-tight">
						<span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: project.color ?? 'var(--ember)' }} />
						{project.name}
						{project.repository ? (
							<a
								href={project.repository}
								target="_blank"
								rel="noreferrer"
								className="text-muted-foreground hover:text-foreground"
								aria-label="Open repository"
							>
								<ExternalLink className="size-3.5" />
							</a>
						) : null}
					</h1>
					<p className="tabular text-xs text-muted-foreground">
						{formatDay(view.range.start)} – {formatDay(view.range.end)}
					</p>
				</div>
				<RangePicker value={slug} />
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatTile label={view.range.label} value={formatDuration(totals.seconds)} accent />
				<StatTile
					label="Daily avg"
					value={formatDuration(totals.dailyAverageSeconds)}
					hint={`${totals.activeDays} of ${view.range.days} days active`}
				/>
				<StatTile
					label="Top branch"
					value={view.branches[0]?.name ?? '—'}
					hint={view.branches[0] ? formatDuration(view.branches[0].seconds) : undefined}
				/>
				<StatTile
					label="Tracked since"
					value={formatDay(project.firstHeartbeatAt.toISOString().slice(0, 10), { month: 'short', year: 'numeric' })}
					hint={`Last active ${formatDay(project.lastHeartbeatAt.toISOString().slice(0, 10))}`}
				/>
			</div>

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<Panel label="Daily · by language" className="lg:col-span-8" meta={formatDuration(totals.seconds)}>
					{totals.seconds > 0 ? (
						<DailyChart daily={view.daily} seriesNames={view.seriesNames} projectColors={{}} />
					) : (
						<PanelEmpty />
					)}
				</Panel>
				<Panel label="Languages" className="lg:col-span-4">
					<Donut items={view.languages} />
				</Panel>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
				<Panel label="Files" className="md:col-span-2 lg:col-span-6" meta={`${view.files.length} files`}>
					<RankedList
						items={view.files}
						limit={12}
						colorFor={() => 'var(--chart-2)'}
						renderName={(path) => <FileName path={path} />}
					/>
				</Panel>
				<Panel label="Branches" className="lg:col-span-3">
					<RankedList items={view.branches} limit={8} colorFor={() => 'var(--chart-3)'} />
				</Panel>
				<Panel label="Categories" className="lg:col-span-3">
					<RankedList items={view.categories} limit={8} colorFor={languageColor} />
				</Panel>
			</div>

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<Panel label="Editors" className="lg:col-span-4">
					<Donut items={view.editors} />
				</Panel>
				<Panel label="Machines" className="lg:col-span-4">
					<RankedList items={view.machines} limit={6} colorFor={() => 'var(--chart-7)'} />
				</Panel>
				<Panel label="Project settings" className="lg:col-span-4">
					<ProjectSettings
						projectId={project.id}
						color={project.color ?? null}
						repository={project.repository ?? null}
						isPublic={project.hasPublicUrl}
					/>
				</Panel>
			</div>

			{project.repository ? (
				<Panel label="Commits" meta="Your time since the previous commit">
					<ProjectCommits project={project.name} />
				</Panel>
			) : null}
		</div>
	);
}
