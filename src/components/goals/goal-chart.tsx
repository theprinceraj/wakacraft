import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration } from '@/lib/format';

import type { GoalResponse } from '@/server/goal/goal.response.dto';

const STATUS_COLOR: Record<GoalResponse['status'], string> = {
	success: 'var(--success)',
	fail: 'var(--destructive)',
	pending: 'var(--ember)',
	ignored: 'oklch(1 0 0 / 14%)',
};

/** One bar per period against the target line; bar color is that period's outcome. */
export function GoalChart({ goal }: { goal: GoalResponse }) {
	const max = Math.max(goal.seconds * 1.25, ...goal.chart_data.map((period) => period.actual_seconds));
	const target = (goal.seconds / max) * 100;

	return (
		<div className="relative h-24">
			<div
				className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/35"
				style={{ bottom: `${target}%` }}
			>
				<span className="tabular absolute -top-3.5 right-0 text-[9.5px] text-muted-foreground">
					{formatDuration(goal.seconds)}
				</span>
			</div>
			<div className="flex h-full items-end gap-1">
				{goal.chart_data.map((period) => (
					<Tooltip key={period.range.start}>
						<TooltipTrigger asChild>
							<div className="flex h-full flex-1 items-end">
								<div
									className="w-full rounded-t-[2px]"
									style={{
										height: `${Math.max(2, (period.actual_seconds / max) * 100)}%`,
										background: STATUS_COLOR[period.range_status],
										opacity: period.actual_seconds ? 1 : 0.35,
									}}
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent side="top" className="text-[11px]">
							<p className="text-muted-foreground">{period.range.text}</p>
							<p className="tabular">
								{formatDuration(period.actual_seconds)} · {period.range_status_reason}
							</p>
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		</div>
	);
}
