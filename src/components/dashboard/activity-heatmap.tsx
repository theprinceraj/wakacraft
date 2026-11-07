'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDay, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Orange opacity per intensity level. Mixing toward transparent in OKLab keeps the hue; OKLCH drifted to magenta. */
const LEVELS = [0, 0.32, 0.55, 0.78, 1];

const levelColor = (level: number) =>
	level === 0 ? 'var(--heat-empty)' : `color-mix(in oklab, var(--heat) ${LEVELS[level] * 100}%, transparent)`;

/** Intensity is relative to the user's own busiest day, so the map stays readable for any workload. */
function level(seconds: number, max: number) {
	if (seconds <= 0 || max <= 0) return 0;
	const ratio = seconds / max;
	return ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
}

/**
 * The past year. With `pickable`, choosing a day writes `?day=` so that the timeline shows it. Cells stay out of the
 * tab order, as 365 stops would trap keyboard users; the timeline's own arrows reach the same days.
 */
export function ActivityHeatmap({
	days,
	pickable = false,
	selected,
	timelineId,
}: {
	days: { date: string; seconds: number }[];
	pickable?: boolean;
	selected?: string;
	timelineId?: string;
}) {
	const router = useRouter();
	const scroller = useRef<HTMLDivElement>(null);
	const max = Math.max(0, ...days.map((day) => day.seconds));
	const weeks: (typeof days)[] = [];
	for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

	const monthLabels = weeks.map((week, index) => {
		const first = week[0]?.date;
		const previous = weeks[index - 1]?.[0]?.date;
		if (!first || (previous && first.slice(5, 7) === previous.slice(5, 7))) return '';
		// A month that starts in the final column has no room for its label.
		if (index === weeks.length - 1) return '';
		// Nor does a partial first month when the next one starts right after it.
		if (index === 0 && weeks[2]?.[0]?.date.slice(5, 7) !== first.slice(5, 7)) return '';
		return formatDay(first, { month: 'short' });
	});

	// On phones the map scrolls sideways; start at today, the end people care about.
	useEffect(() => {
		if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
	}, []);

	const pick = (date: string) => {
		const params = new URLSearchParams(window.location.search);
		params.set('day', date);
		router.push(`?${params}`, { scroll: false });
		if (timelineId) document.getElementById(timelineId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	};

	// Columns stretch with the panel; cells stay square.
	const columns = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` };

	return (
		<div className="flex flex-col gap-3">
			<div ref={scroller} className="-m-0.5 overflow-x-auto p-0.5 [scrollbar-width:thin]">
				<div className="min-w-[660px]">
					<div className="grid gap-[3px]" style={columns} aria-hidden>
						{monthLabels.map((label, index) => (
							<span
								key={weeks[index][0].date}
								className="h-4.5 overflow-visible text-[11px] leading-3.5 whitespace-nowrap text-muted-foreground"
							>
								{label}
							</span>
						))}
					</div>
					<div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={columns}>
						{days.map((day) => {
							const intensity = level(day.seconds, max);
							const label = formatDay(day.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
							return (
								<Tooltip key={day.date}>
									<TooltipTrigger asChild>
										<button
											type="button"
											tabIndex={-1}
											aria-label={`${label}: ${formatDuration(day.seconds)}`}
											aria-current={day.date === selected ? 'date' : undefined}
											onClick={pickable ? () => pick(day.date) : undefined}
											className={cn(
												'aspect-square w-full rounded-[3px] outline-offset-1 hover:outline-2 hover:outline-current',
												!pickable && 'cursor-default',
												day.date === selected && 'outline-2 outline-current',
											)}
											style={{ background: levelColor(intensity) }}
										/>
									</TooltipTrigger>
									<TooltipContent side="top" className="tabular-nums">
										<span className="opacity-70">{label}</span>{' '}
										{day.seconds ? formatDuration(day.seconds) : 'No coding'}
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</div>
			</div>
			<div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground" aria-hidden>
				<span className="mr-0.5">Less</span>
				{LEVELS.map((stop, index) => (
					<span key={stop} className="size-[11px] rounded-[3px]" style={{ background: levelColor(index) }} />
				))}
				<span className="ml-0.5">More</span>
			</div>
		</div>
	);
}
