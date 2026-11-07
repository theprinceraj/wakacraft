import { ArrowRight, FolderGit2 } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { EmptyState, PageSkeleton } from '@/components/app/states';
import { seriesColor } from '@/components/dashboard/colors';
import { StatTile } from '@/components/dashboard/stat-tile';
import { ProjectList } from '@/components/projects/project-list';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { formatDuration } from '@/lib/format';
import { localDateOf } from '@/lib/util/Time';
import { projectService } from '@/server/project/project.service';
import { statsService } from '@/server/stats/stats.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
	return (
		<Suspense fallback={<PageSkeleton rows={1} />}>
			<Projects />
		</Suspense>
	);
}

async function Projects() {
	const session = await requireSession('/projects');
	const [projects, stats, settings] = await Promise.all([
		projectService.list(session.user.id),
		statsService.getStats(session.user.id, 'last_30_days', {}),
		statsService.resolveSettings(session.user.id),
	]);
	const recent = new Map(stats.data.projects.map((project) => [project.name, project.total_seconds]));
	const localDate = (date: Date) => localDateOf(date.getTime() / 1000, settings.timezone);

	const header = (
		<PageHeader title="Projects" description="Created automatically from your editor activity. Nothing to set up." />
	);

	if (!projects.length) {
		return (
			<>
				{header}
				<EmptyState
					icon={FolderGit2}
					title="Your projects will appear here"
					action={
						<Button asChild size="lg">
							<Link href="/settings#editor">
								Connect your editor <ArrowRight />
							</Link>
						</Button>
					}
				>
					They&apos;re created automatically after your first heartbeat, named after the folder you&apos;re working in.
				</EmptyState>
			</>
		);
	}

	// Active projects take palette slots in order of recent time, as they do on the dashboard; the rest stay neutral.
	const byTime = [...recent.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
	const rows = projects.map((project) => {
		const rank = byTime.indexOf(project.name);
		return {
			id: project.id,
			name: project.name,
			color: project.color ?? (rank >= 0 ? seriesColor(rank) : 'var(--chart-8)'),
			seconds: recent.get(project.name) ?? 0,
			firstSeen: localDate(project.firstHeartbeatAt),
			lastActive: localDate(project.lastHeartbeatAt),
		};
	});
	const total = rows.reduce((sum, row) => sum + row.seconds, 0);
	const active = rows.filter((row) => row.seconds > 0).length;
	const top = rows.reduce((best, row) => (row.seconds > best.seconds ? row : best));

	return (
		<>
			{header}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
				<StatTile label="Tracked projects" value={rows.length} hint={`${active} active in the last 30 days`} />
				<StatTile label="Last 30 days" value={formatDuration(total)} hint="Across all projects" />
				<StatTile
					label="Most active"
					value={top.seconds ? top.name : '—'}
					hint={top.seconds ? formatDuration(top.seconds) : 'Nothing in the last 30 days'}
					className="max-md:col-span-2"
				/>
			</div>
			<ProjectList projects={rows} />
		</>
	);
}
