'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatClock, formatDay, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import { projectColor } from './colors';
import { PanelEmpty } from './panel';

import type { DashboardView } from '@/server/dashboard/dashboard.service';

const HOURS = [0, 6, 12, 18, 24];

const shiftDate = (date: string, days: number) => {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const LANE_GRID =
	'grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[7.75rem_minmax(0,1fr)] sm:gap-3';

/** One swimlane per project across the local day; each block is a merged coding duration. */
export function Timeline({
	timeline,
	timezone,
	today,
	projectColors,
}: {
	timeline: DashboardView['timeline'];
	timezone: string;
	today: string;
	projectColors: Record<string, string | null>;
}) {
	const searchParams = useSearchParams();
	const span = timeline.end - timeline.start;
	const total = timeline.blocks.reduce((sum, block) => sum + block.duration, 0);

	const hrefFor = (date: string) => {
		const params = new URLSearchParams(searchParams);
		if (date === today) params.delete('day');
		else params.set('day', date);
		return `?${params}`;
	};
	const navClass =
		'grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-[13px] text-muted-foreground tabular-nums">
					{formatDuration(total)} across {timeline.lanes.length} project{timeline.lanes.length === 1 ? '' : 's'}
				</p>
				<div className="-my-1 flex items-center gap-0.5">
					<Link
						href={hrefFor(shiftDate(timeline.date, -1))}
						scroll={false}
						className={navClass}
						aria-label="Previous day"
					>
						<ChevronLeft className="size-4.5" />
					</Link>
					<span className="min-w-26 text-center text-[13px] font-medium" aria-live="polite">
						{timeline.date === today
							? 'Today'
							: formatDay(timeline.date, { weekday: 'short', month: 'short', day: 'numeric' })}
					</span>
					<Link
						href={hrefFor(shiftDate(timeline.date, 1))}
						scroll={false}
						aria-disabled={timeline.date >= today}
						tabIndex={timeline.date >= today ? -1 : undefined}
						className={cn(navClass, timeline.date >= today && 'pointer-events-none opacity-30')}
						aria-label="Next day"
					>
						<ChevronRight className="size-4.5" />
					</Link>
				</div>
			</div>

			{timeline.lanes.length ? (
				<div className="flex flex-col gap-1.5">
					{timeline.lanes.map((lane, laneIndex) => {
						const color = projectColor(lane, laneIndex, projectColors);
						return (
							<div key={lane} className={LANE_GRID}>
								<span className="truncate text-[13px]" title={lane}>
									{lane}
								</span>
								<div className="relative h-6.5 rounded-md bg-track">
									{timeline.blocks
										.filter((block) => block.lane === lane)
										.map((block) => (
											<Tooltip key={block.start}>
												<TooltipTrigger asChild>
													<span
														tabIndex={0}
														role="img"
														aria-label={`${lane}, ${formatClock(block.start, timezone)} to ${formatClock(block.start + block.duration, timezone)}, ${formatDuration(block.duration)}`}
														className="absolute inset-y-0 rounded-[4px] outline-none before:absolute before:-inset-x-1.5 before:-inset-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
														style={{
															left: `${((block.start - timeline.start) / span) * 100}%`,
															width: `max(3px, ${(block.duration / span) * 100}%)`,
															background: color,
														}}
													/>
												</TooltipTrigger>
												<TooltipContent side="top" className="tabular-nums">
													<p className="opacity-70">
														{formatClock(block.start, timezone)} to{' '}
														{formatClock(block.start + block.duration, timezone)}
													</p>
													<p>
														{formatDuration(block.duration)} · {lane}
													</p>
												</TooltipContent>
											</Tooltip>
										))}
								</div>
							</div>
						);
					})}
					<div className={LANE_GRID} aria-hidden>
						<span />
						<div className="relative h-4">
							{HOURS.map((hour) => (
								<span
									key={hour}
									className="absolute -translate-x-1/2 text-[11px] text-muted-foreground tabular-nums first:translate-x-0 last:-translate-x-full"
									style={{ left: `${(hour / 24) * 100}%` }}
								>
									{String(hour).padStart(2, '0')}
								</span>
							))}
						</div>
					</div>
				</div>
			) : (
				<PanelEmpty>No coding on this day</PanelEmpty>
			)}
		</div>
	);
}
