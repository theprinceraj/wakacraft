'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { formatDay, formatDuration, formatHours, formatWeekday } from '@/lib/format';

import { projectColor } from './colors';

interface DailyChartProps {
	daily: { date: string; total: number; series: Record<string, number> }[];
	seriesNames: string[];
	projectColors: Record<string, string | null>;
}

type TooltipEntry = { dataKey?: string | number; value?: number | string; color?: string };

export function DailyChart({ daily, seriesNames, projectColors }: DailyChartProps) {
	// Project names can hold any characters, so series use positional keys (s0, s1, …) and keep the name as label.
	const series = seriesNames.map((name, index) => ({
		key: `s${index}`,
		name,
		color: projectColor(name, index, projectColors),
	}));
	const config = Object.fromEntries(
		series.map(({ key, name, color }) => [key, { label: name, color }]),
	) satisfies ChartConfig;
	const nameOf = Object.fromEntries(series.map(({ key, name }) => [key, name]));

	const data = daily.map((day) => ({
		date: day.date,
		...Object.fromEntries(series.map(({ key, name }) => [key, day.series[name] ?? 0])),
	}));
	const compact = daily.length > 14;

	return (
		<ChartContainer config={config} className="aspect-auto h-[220px] w-full">
			<BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -12 }} barCategoryGap={compact ? 2 : 6}>
				<CartesianGrid vertical={false} strokeDasharray="2 4" stroke="oklch(1 0 0 / 6%)" />
				<XAxis
					dataKey="date"
					tickLine={false}
					axisLine={false}
					tickMargin={6}
					interval={compact ? 'preserveStartEnd' : 0}
					tickFormatter={(date: string) => (compact ? formatDay(date) : formatWeekday(date))}
				/>
				<YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(seconds: number) => formatHours(seconds)} />
				<ChartTooltip
					cursor={{ fill: 'oklch(1 0 0 / 4%)' }}
					content={({ active, payload, label }) => {
						if (!active || !payload?.length) return null;
						const entries = (payload as unknown as readonly TooltipEntry[])
							.filter((entry) => Number(entry.value) > 0)
							.reverse();
						const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0);
						return (
							<div className="min-w-44 rounded-md border bg-popover/95 px-2.5 py-2 text-[11px] shadow-xl backdrop-blur">
								<div className="mb-1.5 flex justify-between gap-4 text-muted-foreground">
									<span>{formatDay(String(label), { weekday: 'short', month: 'short', day: 'numeric' })}</span>
									<span className="tabular text-foreground">{formatDuration(total)}</span>
								</div>
								{entries.length ? (
									entries.map((entry) => (
										<div key={String(entry.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
											<span className="flex min-w-0 items-center gap-1.5">
												<span className="size-2 shrink-0 rounded-[2px]" style={{ background: entry.color }} />
												<span className="max-w-40 truncate">{nameOf[String(entry.dataKey)]}</span>
											</span>
											<span className="tabular">{formatDuration(Number(entry.value))}</span>
										</div>
									))
								) : (
									<div className="text-muted-foreground">No activity</div>
								)}
							</div>
						);
					}}
				/>
				{series.map(({ key, color }, index) => (
					<Bar
						key={key}
						dataKey={key}
						stackId="day"
						fill={color}
						radius={index === series.length - 1 ? [3, 3, 0, 0] : 0}
						maxBarSize={44}
					/>
				))}
			</BarChart>
		</ChartContainer>
	);
}
