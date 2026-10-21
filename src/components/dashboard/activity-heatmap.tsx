'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDay, formatDuration } from '@/lib/format';

/** Ember opacity per intensity level. Mixing toward transparent in OKLab keeps the hue; OKLCH drifted to magenta. */
const LEVELS = [0, 0.22, 0.45, 0.7, 1];

const levelColor = (level: number) =>
	level === 0 ? 'oklch(1 0 0 / 5%)' : `color-mix(in oklab, var(--ember) ${LEVELS[level] * 100}%, transparent)`;

/** Intensity is relative to the user's own busiest day, so the map stays readable for any workload. */
function level(seconds: number, max: number) {
	if (seconds <= 0 || max <= 0) return 0;
	const ratio = seconds / max;
	return ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
}

export function ActivityHeatmap({ days }: { days: { date: string; seconds: number }[] }) {
	const max = Math.max(0, ...days.map((day) => day.seconds));
	const weeks: (typeof days)[] = [];
	for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

	const monthLabels = weeks.map((week, index) => {
		const first = week[0]?.date;
		const previous = weeks[index - 1]?.[0]?.date;
		return first && (!previous || first.slice(5, 7) !== previous.slice(5, 7))
			? formatDay(first, { month: 'short' })
			: '';
	});

	// Columns stretch with the panel; cells stay square.
	const columns = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` };

	return (
		<div className="flex flex-col gap-2">
			<div className="overflow-x-auto pb-1">
				<div className="min-w-[640px]">
					<div className="grid gap-[3px]" style={columns}>
						{monthLabels.map((label, index) => (
							<span
								key={weeks[index][0].date}
								className="h-3.5 overflow-visible text-[9.5px] leading-3 whitespace-nowrap text-muted-foreground/80"
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
											aria-label={`${label}: ${formatDuration(day.seconds)}`}
											className="aspect-square w-full rounded-[2.5px] ring-ember/70 transition-[scale] outline-none hover:scale-125 focus-visible:ring-1"
											style={{
												background: levelColor(intensity),
												boxShadow:
													intensity === 4 ? '0 0 6px color-mix(in oklab, var(--ember) 60%, transparent)' : undefined,
											}}
										/>
									</TooltipTrigger>
									<TooltipContent side="top" className="tabular text-[11px]">
										<span className="text-muted-foreground">{label}</span> {formatDuration(day.seconds)}
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</div>
			</div>
			<div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
				<span>Less</span>
				{LEVELS.map((stop, index) => (
					<span key={stop} className="size-[9px] rounded-[2px]" style={{ background: levelColor(index) }} />
				))}
				<span>More</span>
			</div>
		</div>
	);
}
