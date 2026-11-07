'use client';

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';

import { seriesColor } from '@/components/dashboard/colors';
import { SeriesLegend } from '@/components/dashboard/series-legend';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { durationTicks, formatAxisDuration, formatDay, formatDuration } from '@/lib/format';

import type { InsightsView } from '@/server/insight/insights-view';

const GRID = 'var(--border)';
const CURSOR = { fill: 'var(--foreground)', fillOpacity: 0.05 };
const DAILY_LINE = 'var(--quiet)';
const AI_COLOR = seriesColor(3);
const HUMAN_COLOR = seriesColor(1);

const compactNumber = (value: number) =>
	new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/** Bucket labels are dates (YYYY-MM-DD) or months (YYYY-MM). */
const labelText = (label: string) =>
	label.length === 7 ? formatDay(`${label}-01`, { month: 'short', year: '2-digit' }) : formatDay(label);

function Tip({ title, rows }: { title: string; rows: { name: string; value: string; color?: string }[] }) {
	return (
		<div className="min-w-40 rounded-xl border bg-popover px-3 py-2.5 text-xs shadow-xl">
			<p className="mb-1 text-muted-foreground">{title}</p>
			{rows.map((row) => (
				<div key={row.name} className="flex items-center justify-between gap-4 py-0.5">
					<span className="flex min-w-0 items-center gap-1.5">
						{row.color ? <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: row.color }} /> : null}
						<span className="truncate">{row.name}</span>
					</span>
					<span className="font-medium tabular-nums">{row.value}</span>
				</div>
			))}
		</div>
	);
}

export function TrendChart({ trend }: { trend: InsightsView['trend'] }) {
	const ticks = durationTicks(Math.max(0, ...trend.flatMap((point) => [point.seconds, point.average])));
	return (
		<>
			<ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
				<ComposedChart data={trend} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
					<CartesianGrid vertical={false} stroke={GRID} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={false}
						tickMargin={6}
						minTickGap={24}
						tickFormatter={labelText}
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
						cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.5 }}
						content={({ active, payload }) => {
							const point = active ? (payload?.[0]?.payload as InsightsView['trend'][number] | undefined) : undefined;
							if (!point) return null;
							return (
								<Tip
									title={labelText(point.label)}
									rows={[
										{ name: 'Coded', value: formatDuration(point.seconds), color: DAILY_LINE },
										{ name: 'Trailing average', value: formatDuration(point.average), color: 'var(--chart-1)' },
									]}
								/>
							);
						}}
					/>
					<Line
						type="linear"
						dataKey="seconds"
						stroke={DAILY_LINE}
						strokeWidth={1.5}
						dot={false}
						isAnimationActive={false}
					/>
					<Line
						type="monotone"
						dataKey="average"
						stroke="var(--chart-1)"
						strokeWidth={2}
						dot={false}
						isAnimationActive={false}
					/>
				</ComposedChart>
			</ChartContainer>
			<SeriesLegend
				mark="line"
				series={[
					{ name: 'Daily total', color: DAILY_LINE },
					{ name: 'Trailing average', color: 'var(--chart-1)' },
				]}
			/>
		</>
	);
}

export function LanguagesOverTime({ data, names }: { data: InsightsView['languagesOverTime']; names: string[] }) {
	const rows = data.map((bucket) => ({
		label: bucket.label,
		...Object.fromEntries(names.map((name, i) => [`s${i}`, bucket.series[name]])),
	}));
	const colorOf = (name: string, index: number) => seriesColor(index, name);
	const ticks = durationTicks(
		Math.max(0, ...data.map((bucket) => names.reduce((sum, name) => sum + (bucket.series[name] ?? 0), 0))),
	);

	return (
		<>
			<ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
				<BarChart
					data={rows}
					margin={{ top: 6, right: 4, bottom: 0, left: -12 }}
					barCategoryGap={rows.length > 14 ? 2 : 6}
				>
					<CartesianGrid vertical={false} stroke={GRID} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={false}
						tickMargin={6}
						minTickGap={24}
						tickFormatter={labelText}
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
						cursor={CURSOR}
						content={({ active, payload, label }) => {
							if (!active || !payload?.length) return null;
							return (
								<Tip
									title={labelText(String(label))}
									rows={names
										.map((name, i) => ({
											name,
											value: Number((payload[0].payload as Record<string, number>)[`s${i}`] ?? 0),
											color: colorOf(name, i),
										}))
										.filter((row) => row.value > 0)
										.reverse()
										.map((row) => ({ ...row, value: formatDuration(row.value) }))}
								/>
							);
						}}
					/>
					{names.map((name, i) => (
						<Bar
							key={name}
							dataKey={`s${i}`}
							name={name}
							stackId="languages"
							fill={colorOf(name, i)}
							stroke="var(--card)"
							strokeWidth={1}
							maxBarSize={24}
							radius={i === names.length - 1 ? [4, 4, 0, 0] : 0}
							isAnimationActive={false}
						/>
					))}
				</BarChart>
			</ChartContainer>
			<SeriesLegend series={names.map((name, i) => ({ name, color: colorOf(name, i) }))} />
		</>
	);
}

export function AiLinesChart({ data }: { data: InsightsView['ai'] }) {
	return (
		<>
			<ChartContainer config={{}} className="aspect-auto h-[180px] w-full">
				<BarChart
					data={data}
					margin={{ top: 4, right: 0, bottom: 0, left: -12 }}
					barCategoryGap={data.length > 14 ? 2 : 6}
				>
					<CartesianGrid vertical={false} stroke={GRID} />
					<XAxis
						dataKey="label"
						tickLine={false}
						axisLine={false}
						tickMargin={6}
						minTickGap={24}
						tickFormatter={labelText}
					/>
					<YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compactNumber} />
					<ChartTooltip
						cursor={CURSOR}
						content={({ active, payload }) => {
							const point = active ? (payload?.[0]?.payload as InsightsView['ai'][number] | undefined) : undefined;
							if (!point) return null;
							return (
								<Tip
									title={labelText(point.label)}
									rows={[
										{ name: 'AI lines', value: point.ai.toLocaleString(), color: AI_COLOR },
										{ name: 'Hand-written lines', value: point.human.toLocaleString(), color: HUMAN_COLOR },
									]}
								/>
							);
						}}
					/>
					<Bar
						dataKey="ai"
						stackId="lines"
						fill={AI_COLOR}
						stroke="var(--card)"
						strokeWidth={1}
						maxBarSize={24}
						isAnimationActive={false}
					/>
					<Bar
						dataKey="human"
						stackId="lines"
						fill={HUMAN_COLOR}
						stroke="var(--card)"
						strokeWidth={1}
						maxBarSize={24}
						radius={[4, 4, 0, 0]}
						isAnimationActive={false}
					/>
				</BarChart>
			</ChartContainer>
			<SeriesLegend
				series={[
					{ name: 'AI', color: AI_COLOR },
					{ name: 'Hand-written', color: HUMAN_COLOR },
				]}
			/>
		</>
	);
}
