import { formatDay } from '@/lib/format';

import type { WrappedDay } from '@/server/github-wrapped/derive';

const OPACITY = [0, 0.32, 0.55, 0.78, 1];

/**
 * A year of contribution days in columns of weeks, Monday on top, shaded like GitHub's graph in wakacraft orange.
 * The cells shrink with the card, so the whole year fits on a phone without sideways scrolling.
 */
export function ContributionGraph({ days }: { days: WrappedDay[] }) {
	const first = days[0]?.date;
	// Empty cells before the first day line it up under its weekday.
	const offset = first ? (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
	const weeks = Math.ceil((offset + days.length) / 7);

	return (
		<div className="min-w-0">
			<div
				role="img"
				aria-label={`Contribution graph: ${days.filter((day) => day.count).length} active days`}
				className="grid gap-[2px] sm:gap-[3px]"
				style={{
					gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
					gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
					gridAutoFlow: 'column',
				}}
			>
				{Array.from({ length: offset }, (_, index) => (
					<span key={`pad-${index}`} />
				))}
				{days.map((day) => (
					<span
						key={day.date}
						title={`${day.count.toLocaleString('en-US')} on ${formatDay(day.date, { month: 'long', day: 'numeric' })}`}
						className="aspect-square rounded-[1.5px] sm:rounded-[3px]"
						style={
							day.level
								? { background: 'var(--heat)', opacity: OPACITY[day.level] }
								: { background: 'var(--heat-empty)' }
						}
					/>
				))}
			</div>
		</div>
	);
}

export function GraphLegend() {
	return (
		<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
			Less
			{OPACITY.map((opacity, level) => (
				<span
					key={level}
					className="size-2.5 rounded-[2px]"
					style={level ? { background: 'var(--heat)', opacity } : { background: 'var(--heat-empty)' }}
				/>
			))}
			More
		</div>
	);
}
