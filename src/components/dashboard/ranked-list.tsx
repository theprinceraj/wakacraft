import { formatDuration, formatPercent } from '@/lib/format';

import { PanelEmpty } from './panel';

import type { Breakdown } from '@/server/dashboard/dashboard.service';
import type { ReactNode } from 'react';

/** Horizontal bar list: name, share bar, time. Dense alternative to a chart for long-tail dimensions. */
export function RankedList({
	items,
	limit = 8,
	colorFor,
	renderName,
}: {
	items: Breakdown[];
	limit?: number;
	colorFor?: (name: string, index: number) => string;
	renderName?: (name: string) => ReactNode;
}) {
	if (!items.length) return <PanelEmpty />;
	const max = items[0].seconds;

	return (
		<ul className="flex flex-col gap-2">
			{items.slice(0, limit).map((item, index) => {
				const color = colorFor?.(item.name, index) ?? 'var(--ember)';
				return (
					<li key={item.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
						<span className="truncate text-xs" title={item.name}>
							{renderName ? renderName(item.name) : item.name}
						</span>
						<span className="tabular text-[11px] text-muted-foreground">
							{formatDuration(item.seconds)}
							<span className="ml-2 inline-block w-9 text-right text-muted-foreground/60">
								{formatPercent(item.percent)}
							</span>
						</span>
						<div className="col-span-2 h-[3px] overflow-hidden rounded-full bg-white/5">
							<div
								className="h-full rounded-full"
								style={{
									width: `${Math.max(2, (item.seconds / max) * 100)}%`,
									background: color,
									boxShadow: `0 0 8px color-mix(in oklch, ${color} 50%, transparent)`,
								}}
							/>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
