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

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

const shiftDate = (date: string, days: number) => {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

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

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1">
					<Link
						href={hrefFor(shiftDate(timeline.date, -1))}
						scroll={false}
						className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
						aria-label="Previous day"
					>
						<ChevronLeft className="size-3.5" />
					</Link>
					<span className="tabular min-w-28 text-center text-xs">
						{timeline.date === today
							? 'Today'
							: formatDay(timeline.date, { weekday: 'short', month: 'short', day: 'numeric' })}
					</span>
					<Link
						href={hrefFor(shiftDate(timeline.date, 1))}
						scroll={false}
						aria-disabled={timeline.date >= today}
						className={cn(
							'rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground',
							timeline.date >= today && 'pointer-events-none opacity-30',
						)}
						aria-label="Next day"
					>
						<ChevronRight className="size-3.5" />
					</Link>
				</div>
				<span className="tabular text-xs text-ember">{formatDuration(total)}</span>
			</div>

			{timeline.lanes.length ? (
				<div className="flex flex-col gap-1.5">
					{timeline.lanes.map((lane, laneIndex) => {
						const color = projectColor(lane, laneIndex, projectColors);
						return (
							<div key={lane} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
								<span className="truncate text-[11px] text-muted-foreground" title={lane}>
									{lane}
								</span>
								<div className="relative h-4 rounded-[3px] bg-white/[0.03]">
									{timeline.blocks
										.filter((block) => block.lane === lane)
										.map((block) => (
											<Tooltip key={block.start}>
												<TooltipTrigger asChild>
													<span
														className="absolute top-0 h-full rounded-[2px]"
														style={{
															left: `${((block.start - timeline.start) / span) * 100}%`,
															width: `max(2px, ${(block.duration / span) * 100}%)`,
															background: color,
															boxShadow: `0 0 8px color-mix(in oklch, ${color} 45%, transparent)`,
														}}
													/>
												</TooltipTrigger>
												<TooltipContent side="top" className="tabular text-[11px]">
													{lane} · {formatClock(block.start, timezone)}–
													{formatClock(block.start + block.duration, timezone)} · {formatDuration(block.duration)}
												</TooltipContent>
											</Tooltip>
										))}
								</div>
							</div>
						);
					})}
					<div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
						<span />
						<div className="relative h-3">
							{HOURS.map((hour) => (
								<span
									key={hour}
									className="tabular absolute -translate-x-1/2 text-[9.5px] text-muted-foreground/70 first:translate-x-0 last:-translate-x-full"
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
