import { ArrowUpRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { formatDuration, formatPercent } from '@/lib/format';

import { PanelEmpty } from './panel';

import type { Breakdown } from '@/server/dashboard/dashboard.service';
import type { ReactNode } from 'react';

function Row({
	item,
	max,
	color,
	swatch,
	bars,
	renderName,
	showPercent,
	href,
}: {
	item: Breakdown;
	max: number;
	color: string;
	swatch: boolean;
	bars: boolean;
	renderName?: (name: string) => ReactNode;
	showPercent: boolean;
	href?: string;
}) {
	const body = (
		<>
			<div className="flex min-w-0 items-baseline gap-2 text-sm">
				{swatch ? <span className="size-2.5 shrink-0 self-center rounded-[3px]" style={{ background: color }} /> : null}
				<span className="min-w-0 flex-1 truncate" title={item.name}>
					{renderName ? renderName(item.name) : item.name}
				</span>
				<span className="font-medium whitespace-nowrap tabular-nums">{formatDuration(item.seconds)}</span>
				{showPercent ? (
					<span className="w-9 shrink-0 text-right text-[12.5px] text-muted-foreground tabular-nums">
						{formatPercent(item.percent)}
					</span>
				) : null}
				{href ? (
					<ArrowUpRight className="size-3.5 shrink-0 self-center text-muted-foreground transition-transform group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
				) : null}
			</div>
			{bars ? (
				<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
					<div
						className="h-full rounded-full"
						style={{ width: `${Math.max(1.5, (item.seconds / max) * 100)}%`, background: color }}
					/>
				</div>
			) : null}
		</>
	);
	return (
		<li className="min-w-0">
			{href ? (
				<Link
					href={href}
					className="group/row -mx-2.5 -my-1.5 block rounded-xl px-2.5 py-1.5 transition-colors hover:bg-accent"
				>
					{body}
				</Link>
			) : (
				body
			)}
		</li>
	);
}

/**
 * Ranked rows: name, time, share and a bar. Without `colorFor` every bar is the one neutral colour, since a single
 * series has no identity to encode. A long tail folds behind "Show all" rather than being dropped.
 */
export function RankedList({
	items,
	limit = 8,
	colorFor,
	renderName,
	hrefFor,
	bars = true,
	showPercent = true,
}: {
	items: Breakdown[];
	limit?: number;
	colorFor?: (name: string, index: number) => string;
	renderName?: (name: string) => ReactNode;
	hrefFor?: (name: string) => string;
	bars?: boolean;
	showPercent?: boolean;
}) {
	if (!items.length) return <PanelEmpty />;
	const max = Math.max(1, ...items.map((item) => item.seconds));
	const row = (item: Breakdown, index: number) => (
		<Row
			key={item.name}
			item={item}
			max={max}
			color={colorFor?.(item.name, index) ?? 'var(--bar)'}
			swatch={Boolean(colorFor)}
			bars={bars}
			renderName={renderName}
			showPercent={showPercent}
			href={hrefFor?.(item.name)}
		/>
	);
	const rest = items.slice(limit);

	return (
		<div className="flex flex-col">
			<ul className="flex flex-col gap-3">{items.slice(0, limit).map(row)}</ul>
			{rest.length ? (
				<details className="group/more">
					<summary className="mt-3 inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-[13px] font-medium [&::-webkit-details-marker]:hidden">
						<span className="group-open/more:hidden">Show all {items.length}</span>
						<span className="hidden group-open/more:inline">Show less</span>
						<ChevronDown className="size-3.5 transition-transform group-open/more:rotate-180" aria-hidden />
					</summary>
					<ul className="mt-3 flex flex-col gap-3">{rest.map((item, index) => row(item, index + limit))}</ul>
				</details>
			) : null}
		</div>
	);
}
