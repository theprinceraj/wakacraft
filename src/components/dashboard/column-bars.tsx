import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration } from '@/lib/format';

export interface ColumnItem {
	key: string | number;
	label: string;
	seconds: number;
	/** Longer name for the tooltip. */
	title?: string;
	/** Extra tooltip line. */
	detail?: string;
}

/** Single-series columns: the peak is the one orange, labelled mark and the rest stay quiet. */
export function ColumnBars({
	items,
	height = 160,
	maxBarWidth = 24,
	labelEvery = 1,
	format = formatDuration,
}: {
	items: ColumnItem[];
	height?: number;
	maxBarWidth?: number;
	labelEvery?: number;
	format?: (seconds: number) => string;
}) {
	const peak = Math.max(0, ...items.map((item) => item.seconds));
	const peakIndex = peak > 0 ? items.findIndex((item) => item.seconds === peak) : -1;
	const usable = height - 24;

	return (
		<div>
			<div className="flex items-end border-b" style={{ height }}>
				{items.map((item, index) => (
					<Tooltip key={item.key}>
						<TooltipTrigger asChild>
							<div
								tabIndex={0}
								role="img"
								aria-label={`${item.title ?? item.label}: ${format(item.seconds)}`}
								className="flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-t-lg px-px transition-colors outline-none hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"
							>
								{index === peakIndex ? (
									<span className="mb-1 text-xs font-medium whitespace-nowrap">{format(item.seconds)}</span>
								) : null}
								<span
									className="block w-full rounded-t-[4px]"
									style={{
										maxWidth: maxBarWidth,
										height: item.seconds ? Math.max(3, (item.seconds / peak) * usable) : 2,
										background: index === peakIndex ? 'var(--peak)' : 'var(--quiet)',
									}}
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent side="top" className="tabular-nums">
							<p className="opacity-70">{item.title ?? item.label}</p>
							<p>{format(item.seconds)}</p>
							{item.detail ? <p className="opacity-70">{item.detail}</p> : null}
						</TooltipContent>
					</Tooltip>
				))}
			</div>
			<div className="mt-2 flex text-[11px] text-muted-foreground tabular-nums" aria-hidden>
				{items.map((item, index) => (
					<span key={item.key} className="min-w-0 flex-1 text-center whitespace-nowrap">
						{index % labelEvery === 0 ? item.label : ''}
					</span>
				))}
			</div>
		</div>
	);
}
