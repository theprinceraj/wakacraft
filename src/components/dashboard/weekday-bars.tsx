import { formatDuration } from '@/lib/format';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Seven vertical bars, ordered from the user's week start. */
export function WeekdayBars({
	weekdays,
	weekStartDay = 1,
}: {
	weekdays: { weekday: number; seconds: number }[];
	weekStartDay?: number;
}) {
	const ordered = Array.from({ length: 7 }, (_, index) => weekdays[(weekStartDay + index) % 7]);
	const max = Math.max(1, ...ordered.map((day) => day.seconds));

	return (
		<div className="grid h-[132px] grid-cols-7 items-end gap-2">
			{ordered.map((day) => (
				<div key={day.weekday} className="flex h-full flex-col items-center justify-end gap-1.5">
					<span className="tabular text-[9.5px] text-muted-foreground/80">
						{day.seconds ? formatDuration(day.seconds) : ''}
					</span>
					<div
						className="w-full max-w-7 rounded-t-[3px] bg-chart-2"
						style={{
							height: `${Math.max(day.seconds ? 4 : 1, (day.seconds / max) * 100)}%`,
							opacity: day.seconds ? 1 : 0.15,
							boxShadow: day.seconds ? '0 0 10px color-mix(in oklch, var(--chart-2) 35%, transparent)' : undefined,
						}}
					/>
					<span className="text-[10px] text-muted-foreground">{NAMES[day.weekday]}</span>
				</div>
			))}
		</div>
	);
}
