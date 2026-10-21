'use client';

import { Cell, Pie, PieChart } from 'recharts';

import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatDuration, formatPercent } from '@/lib/format';

import { seriesColor } from './colors';
import { PanelEmpty } from './panel';

import type { Breakdown } from '@/server/dashboard/dashboard.service';

const MAX_SLICES = 6;

/** Donut + legend. Slices beyond the top few fold into "Other" so the ring stays legible. */
export function Donut({ items }: { items: Breakdown[] }) {
	if (!items.length) return <PanelEmpty />;

	const top = items.slice(0, MAX_SLICES);
	const rest = items.slice(MAX_SLICES);
	const slices = rest.length
		? [
				...top,
				{
					name: 'Other',
					seconds: rest.reduce((sum, item) => sum + item.seconds, 0),
					percent: rest.reduce((sum, item) => sum + item.percent, 0),
				},
			]
		: top;
	const colored = slices.map((slice, index) => ({ ...slice, color: seriesColor(index, slice.name) }));

	return (
		<div className="flex items-center gap-4">
			<ChartContainer config={{}} className="aspect-square h-[132px] shrink-0">
				<PieChart>
					<ChartTooltip
						content={({ active, payload }) => {
							const slice = active ? (payload?.[0]?.payload as (typeof colored)[number] | undefined) : undefined;
							if (!slice) return null;
							return (
								<div className="rounded-md border bg-popover/95 px-2.5 py-1.5 text-[11px] shadow-xl backdrop-blur">
									<span className="mr-3">{slice.name}</span>
									<span className="tabular">{formatDuration(slice.seconds)}</span>
								</div>
							);
						}}
					/>
					<Pie
						data={colored}
						dataKey="seconds"
						nameKey="name"
						innerRadius="66%"
						outerRadius="100%"
						paddingAngle={colored.length > 1 ? 2 : 0}
						stroke="none"
						isAnimationActive={false}
					>
						{colored.map((slice) => (
							<Cell key={slice.name} fill={slice.color} />
						))}
					</Pie>
				</PieChart>
			</ChartContainer>
			<ul className="flex min-w-0 flex-1 flex-col gap-1.5">
				{colored.map((slice) => (
					<li key={slice.name} className="flex items-center gap-2 text-xs">
						<span className="size-2 shrink-0 rounded-[2px]" style={{ background: slice.color }} />
						<span className="min-w-0 flex-1 truncate">{slice.name}</span>
						<span className="tabular text-[11px] text-muted-foreground">{formatPercent(slice.percent)}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
