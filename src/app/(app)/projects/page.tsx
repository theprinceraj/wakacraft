import { FolderGit2 } from 'lucide-react';
import { Suspense } from 'react';

import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { requireSession } from '@/lib/auth/session';
import { formatDay, formatDuration } from '@/lib/format';
import { statsService } from '@/server/stats/stats.service';
import { projectService } from '@/server/project/project.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Projects />
		</Suspense>
	);
}

async function Projects() {
	const session = await requireSession('/projects');
	const [projects, stats] = await Promise.all([
		projectService.list(session.user.id),
		statsService.getStats(session.user.id, 'last_30_days', {}),
	]);
	const recent = new Map(stats.data.projects.map((project) => [project.name, project.total_seconds]));

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-lg font-semibold tracking-tight">Projects</h1>
				<p className="text-xs text-muted-foreground">Created automatically from your editor activity.</p>
			</div>
			<Panel label={`${projects.length} projects`} bodyClassName="p-0">
				{projects.length ? (
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b text-left text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase">
								<th className="px-3.5 py-2 font-medium">Project</th>
								<th className="px-3.5 py-2 font-medium">Last 30 days</th>
								<th className="hidden px-3.5 py-2 font-medium sm:table-cell">First seen</th>
								<th className="px-3.5 py-2 font-medium">Last active</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{projects.map((project) => (
								<tr key={project.id} className="hover:bg-accent/40">
									<td className="px-3.5 py-2.5">
										<span className="flex items-center gap-2">
											<FolderGit2 className="size-3.5 text-muted-foreground" aria-hidden />
											<span className="truncate">{project.name}</span>
										</span>
									</td>
									<td className="tabular px-3.5 py-2.5 text-xs">{formatDuration(recent.get(project.name) ?? 0)}</td>
									<td className="tabular hidden px-3.5 py-2.5 text-xs text-muted-foreground sm:table-cell">
										{formatDay(project.firstHeartbeatAt.toISOString().slice(0, 10), {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
										})}
									</td>
									<td className="tabular px-3.5 py-2.5 text-xs text-muted-foreground">
										{formatDay(project.lastHeartbeatAt.toISOString().slice(0, 10), {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
										})}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<PanelEmpty>No projects yet — they appear after your first heartbeat.</PanelEmpty>
				)}
			</Panel>
		</div>
	);
}
