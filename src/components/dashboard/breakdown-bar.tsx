import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration, formatPercent } from '@/lib/format';

import { seriesColor } from './colors';
import { PanelEmpty } from './panel';
import { RankedList } from './ranked-list';

import type { Breakdown } from '@/server/dashboard/dashboard.service';

const MAX_PARTS = 6;

/** One whole split into parts, with the exact numbers listed below. Easier to compare than a donut. */
export function BreakdownBar({
	items,
	colorFor,
	barClassName = 'h-2',
}: {
	items: Breakdown[];
	colorFor?: (name: string, index: number) => string;
	barClassName?: string;
}) {
	if (!items.length) return <PanelEmpty />;

	const named = items.filter((item) => item.name !== 'Other');
	const rest = [...named.slice(MAX_PARTS), ...items.filter((item) => item.name === 'Other')];
	const parts = rest.length
		? [
				...named.slice(0, MAX_PARTS),
				{
					name: 'Other',
					seconds: rest.reduce((sum, item) => sum + item.seconds, 0),
					percent: rest.reduce((sum, item) => sum + item.percent, 0),
				},
			]
		: named;
	const color = (name: string, index: number) => colorFor?.(name, index) ?? seriesColor(index, name);

	return (
		<div className="flex flex-col gap-4.5">
			<div
				className={`flex gap-0.5 overflow-hidden rounded-full ${barClassName}`}
				role="img"
				aria-label={parts.map((part) => `${part.name} ${formatPercent(part.percent)}`).join(', ')}
			>
				{parts
					.filter((part) => part.seconds > 0)
					.map((part, index) => (
						<Tooltip key={part.name}>
							<TooltipTrigger asChild>
								<span
									className="block min-w-0.5"
									style={{ flexGrow: part.seconds, flexBasis: 0, background: color(part.name, index) }}
								/>
							</TooltipTrigger>
							<TooltipContent side="top" className="tabular-nums">
								{part.name} · {formatDuration(part.seconds)} · {formatPercent(part.percent)}
							</TooltipContent>
						</Tooltip>
					))}
			</div>
			<RankedList items={parts} limit={MAX_PARTS + 1} colorFor={color} bars={false} />
		</div>
	);
}
