import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration } from '@/lib/format';

import type { GoalResponse } from '@/server/goal/goal.response.dto';

/** Met periods are solid, misses quiet, and the current one orange; the tooltip always says which in words. */
const STATUS_COLOR: Record<GoalResponse['status'], string> = {
	success: 'var(--bar)',
	fail: 'var(--quiet)',
	pending: 'var(--ember)',
	ignored: 'var(--track)',
};

/** One bar per period against the target line. */
export function GoalChart({ goal }: { goal: GoalResponse }) {
	const max = Math.max(goal.seconds * 1.25, ...goal.chart_data.map((period) => period.actual_seconds));
	const target = (goal.seconds / max) * 100;

	return (
		<div className="relative h-18" role="img" aria-label={`Last ${goal.chart_data.length} periods against the target`}>
			<div
				className="pointer-events-none absolute inset-x-0 z-10 border-t border-muted-foreground/55"
				style={{ bottom: `${target}%` }}
			/>
			<div className="flex h-full items-end">
				{goal.chart_data.map((period) => (
					<Tooltip key={period.range.start}>
						<TooltipTrigger asChild>
							<div className="flex h-full min-w-0 flex-1 items-end justify-center rounded-t-md px-px hover:bg-foreground/5">
								<div
									className="w-full max-w-4.5 rounded-t-[3px]"
									style={{
										height: `${Math.max(3, (period.actual_seconds / max) * 100)}%`,
										background: STATUS_COLOR[period.range_status],
									}}
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent side="top" className="tabular-nums">
							<p className="opacity-70">{period.range.text}</p>
							<p>
								{formatDuration(period.actual_seconds)} · {period.range_status_reason}
							</p>
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		</div>
	);
}
