'use client';

import { ChartColumn, Table2 } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { durationTicks, formatAxisDuration, formatDay, formatDuration, formatWeekday } from '@/lib/format';

import { projectColor } from './colors';
import { SeriesLegend } from './series-legend';

interface DailyChartProps {
	daily: { date: string; total: number; series: Record<string, number> }[];
	seriesNames: string[];
	projectColors: Record<string, string | null>;
}

type TooltipEntry = { dataKey?: string | number; value?: number | string; color?: string };

const longDay = (date: string) => formatDay(date, { weekday: 'short', month: 'short', day: 'numeric' });

/** Stacked daily columns with a table twin, so that every value can be read without hovering. */
export function DailyChart({ daily, seriesNames, projectColors }: DailyChartProps) {
	const [asTable, setAsTable] = useState(false);
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
	const ticks = durationTicks(Math.max(0, ...daily.map((day) => day.total)));

	return (
		<div>
			<Button
				size="sm"
				variant="ghost"
				className="absolute top-5 right-4 sm:top-6 sm:right-5"
				aria-pressed={asTable}
				onClick={() => setAsTable(!asTable)}
			>
				{asTable ? <ChartColumn /> : <Table2 />} {asTable ? 'Chart' : 'Table'}
			</Button>
			{asTable ? (
				<div className="max-h-72 overflow-auto">
					<table className="w-full border-collapse text-[13px] whitespace-nowrap tabular-nums">
						<thead>
							<tr className="border-b text-left text-muted-foreground">
								<th className="sticky top-0 bg-card py-2 pr-3 font-medium">Date</th>
								{seriesNames.map((name) => (
									<th key={name} className="sticky top-0 bg-card py-2 pr-3 font-medium">
										{name}
									</th>
								))}
								<th className="sticky top-0 bg-card py-2 pr-3 font-medium">Total</th>
							</tr>
						</thead>
						<tbody>
							{[...daily].reverse().map((day) => (
								<tr key={day.date} className="border-b last:border-0">
									<td className="py-2 pr-3">{longDay(day.date)}</td>
									{seriesNames.map((name) => (
										<td key={name} className="py-2 pr-3">
											{formatDuration(day.series[name] ?? 0)}
										</td>
									))}
									<td className="py-2 pr-3 font-medium">{formatDuration(day.total)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<>
					<ChartContainer config={config} className="aspect-auto h-[220px] w-full">
						<BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -12 }} barCategoryGap={compact ? 2 : 6}>
							<CartesianGrid vertical={false} stroke="var(--border)" />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={6}
								interval={compact ? 'preserveStartEnd' : 0}
								minTickGap={compact ? 24 : 0}
								tickFormatter={(date: string) => (compact ? formatDay(date) : formatWeekday(date))}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={44}
								ticks={ticks}
								domain={[0, ticks.at(-1)!]}
								tickFormatter={formatAxisDuration}
							/>
							<ChartTooltip
								cursor={{ fill: 'var(--foreground)', fillOpacity: 0.05 }}
								content={({ active, payload, label }) => {
									if (!active || !payload?.length) return null;
									const entries = (payload as unknown as readonly TooltipEntry[])
										.filter((entry) => Number(entry.value) > 0)
										.reverse();
									const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0);
									return (
										<div className="min-w-44 rounded-xl border bg-popover px-3 py-2.5 text-xs shadow-xl">
											<div className="mb-1.5 flex justify-between gap-4 text-muted-foreground">
												<span>{longDay(String(label))}</span>
												<span className="font-medium text-foreground tabular-nums">{formatDuration(total)}</span>
											</div>
											{entries.length ? (
												entries.map((entry) => (
													<div key={String(entry.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
														<span className="flex min-w-0 items-center gap-1.5">
															<span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: entry.color }} />
															<span className="max-w-40 truncate">{nameOf[String(entry.dataKey)]}</span>
														</span>
														<span className="tabular-nums">{formatDuration(Number(entry.value))}</span>
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
									stroke="var(--card)"
									strokeWidth={1}
									radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
									maxBarSize={24}
									isAnimationActive={false}
								/>
							))}
						</BarChart>
					</ChartContainer>
					<SeriesLegend series={series} />
				</>
			)}
		</div>
	);
}
