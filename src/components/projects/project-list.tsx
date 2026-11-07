'use client';

import { ArrowUpRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Segmented } from '@/components/app/segmented';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDay, formatDuration } from '@/lib/format';

export interface ProjectRow {
	id: string;
	name: string;
	color: string;
	seconds: number;
	/** Local calendar dates. */
	firstSeen: string;
	lastActive: string;
}

const SORTS = [
	{ value: 'recent', label: 'Recent' },
	{ value: 'time', label: 'Time' },
	{ value: 'name', label: 'Name' },
];

const COLUMNS =
	'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_90px_100px_16px]';

/** Every project, findable: search as you type, sorted by what you need right now. */
export function ProjectList({ projects }: { projects: ProjectRow[] }) {
	const [query, setQuery] = useState('');
	const [sort, setSort] = useState('recent');

	const shown = useMemo(() => {
		const term = query.trim().toLowerCase();
		return projects
			.filter((project) => project.name.toLowerCase().includes(term))
			.sort((a, b) =>
				sort === 'name'
					? a.name.localeCompare(b.name)
					: sort === 'time'
						? b.seconds - a.seconds
						: b.lastActive.localeCompare(a.lastActive),
			);
	}, [projects, query, sort]);
	const max = Math.max(1, ...projects.map((project) => project.seconds));

	return (
		<>
			<div className="mt-6 flex flex-wrap items-center justify-between gap-3">
				<label className="relative max-w-90 min-w-44 flex-1">
					<span className="sr-only">Search projects</span>
					<Search
						className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search projects"
						autoComplete="off"
						className="rounded-full pl-9.5"
					/>
				</label>
				<div className="flex min-w-0 items-center gap-3 text-[13px]">
					<span className="shrink-0 text-muted-foreground">Sort by</span>
					<Segmented aria-label="Sort projects" value={sort} onValueChange={setSort} options={SORTS} />
				</div>
			</div>

			<section className="tile mt-4 overflow-hidden" aria-label="All projects">
				{shown.length ? (
					<>
						<div
							className={`${COLUMNS} hidden px-5.5 py-2.5 text-[12.5px] text-muted-foreground sm:px-7 md:grid`}
							aria-hidden
						>
							<span>Project</span>
							<span>Last 30 days</span>
							<span>First seen</span>
							<span>Last active</span>
							<span />
						</div>
						<ul className="divide-y border-t">
							{shown.map((project) => (
								<li key={project.id}>
									<Link
										href={`/projects/${encodeURIComponent(project.name)}`}
										className={`${COLUMNS} group/row px-5.5 py-3.5 transition-colors hover:bg-accent sm:px-7`}
									>
										<span className="flex min-w-0 items-center gap-2.5">
											<span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: project.color }} />
											<span className="min-w-0">
												<span className="block truncate font-medium" title={project.name}>
													{project.name}
												</span>
												<span className="block text-xs text-muted-foreground">
													Active {formatDay(project.lastActive, { month: 'short', day: 'numeric', year: 'numeric' })}
												</span>
											</span>
										</span>
										<span className="hidden min-w-0 md:block">
											<span className="block text-[13px] tabular-nums">
												{project.seconds ? formatDuration(project.seconds) : '—'}
											</span>
											<span className="mt-1.5 block h-1.5 max-w-60 overflow-hidden rounded-full bg-track">
												<span
													className="block h-full rounded-full"
													style={{ width: `${(project.seconds / max) * 100}%`, background: project.color }}
												/>
											</span>
										</span>
										<span className="hidden text-[13px] text-muted-foreground tabular-nums md:block">
											{formatDay(project.firstSeen, { month: 'short', year: 'numeric' })}
										</span>
										<span className="hidden text-[13px] text-muted-foreground tabular-nums md:block">
											{formatDay(project.lastActive)}
										</span>
										<span className="flex items-center justify-end gap-2.5">
											<span className="text-[13px] tabular-nums md:hidden">
												{project.seconds ? formatDuration(project.seconds) : '—'}
											</span>
											<ArrowUpRight
												className="size-4 text-muted-foreground transition-transform group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5"
												aria-hidden
											/>
										</span>
									</Link>
								</li>
							))}
						</ul>
					</>
				) : (
					<div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
						<p className="font-semibold tracking-[-0.02em]">No projects match “{query}”</p>
						<Button variant="outline" onClick={() => setQuery('')}>
							Clear search
						</Button>
					</div>
				)}
			</section>
		</>
	);
}
