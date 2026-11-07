import { cn } from '@/lib/utils';

/** The legend under a multi-series chart. `mark` mirrors the chart: a box for bars, a short stroke for lines. */
export function SeriesLegend({
	series,
	mark = 'box',
}: {
	series: { name: string; color: string }[];
	mark?: 'box' | 'line';
}) {
	if (series.length < 2) return null;
	return (
		<ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
			{series.map(({ name, color }) => (
				<li key={name} className="flex min-w-0 items-center gap-1.75">
					<span
						className={cn('shrink-0', mark === 'box' ? 'size-2.5 rounded-[3px]' : 'h-0.5 w-3.5 rounded-full')}
						style={{ background: color }}
					/>
					<span className="max-w-48 truncate">{name}</span>
				</li>
			))}
		</ul>
	);
}
