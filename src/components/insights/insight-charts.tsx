'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, XAxis, YAxis, ComposedChart } from 'recharts';

import { seriesColor } from '@/components/dashboard/colors';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatDay, formatDuration, formatHours } from '@/lib/format';

import type { InsightsView } from '@/server/insight/insights-view';

const GRID = 'oklch(1 0 0 / 6%)';

const compactNumber = (value: number) =>
	new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/** Bucket labels are dates (YYYY-MM-DD) or months (YYYY-MM). */
const labelText = (label: string) =>
	label.length === 7 ? formatDay(`${label}-01`, { month: 'short', year: '2-digit' }) : formatDay(label);

function Tip({ title, rows }: { title: string; rows: { name: string; value: string; color?: string }[] }) {
	return (
		<div className="min-w-40 rounded-md border bg-popover/95 px-2.5 py-2 text-[11px] shadow-xl backdrop-blur">
			<p className="mb-1 text-muted-foreground">{title}</p>
			{rows.map((row) => (
				<div key={row.name} className="flex items-center justify-between gap-4 py-0.5">
					<span className="flex items-center gap-1.5">
						{row.color ? <span className="size-2 rounded-[2px]" style={{ background: row.color }} /> : null}
						{row.name}
					</span>
					<span className="tabular">{row.value}</span>
				</div>
			))}
		</div>
	);
}

export function TrendChart({ trend }: { trend: InsightsView['trend'] }) {
	return (
		<ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
			<ComposedChart data={trend} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
				<defs>
					<linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
						<stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid vertical={false} strokeDasharray="2 4" stroke={GRID} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={6}
					minTickGap={24}
					tickFormatter={labelText}
				/>
				<YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(seconds: number) => formatHours(seconds)} />
				<ChartTooltip
					content={({ active, payload }) => {
						const point = active ? (payload?.[0]?.payload as InsightsView['trend'][number] | undefined) : undefined;
						if (!point) return null;
						return (
							<Tip
								title={labelText(point.label)}
								rows={[
									{ name: 'Coded', value: formatDuration(point.seconds), color: 'var(--chart-2)' },
									{ name: 'Trailing avg', value: formatDuration(point.average), color: 'var(--ember)' },
								]}
							/>
						);
					}}
				/>
				<Area type="monotone" dataKey="seconds" stroke="var(--chart-2)" strokeWidth={1.5} fill="url(#trend-fill)" />
				<Line
					type="monotone"
					dataKey="average"
					stroke="var(--ember)"
					strokeWidth={2}
					dot={false}
					className="glow text-ember"
				/>
			</ComposedChart>
		</ChartContainer>
	);
}

export function HoursChart({ hours }: { hours: InsightsView['hours'] }) {
	return (
		<ChartContainer config={{}} className="aspect-auto h-[180px] w-full">
			<BarChart data={hours} margin={{ top: 4, right: 0, bottom: 0, left: -12 }} barCategoryGap={2}>
				<CartesianGrid vertical={false} strokeDasharray="2 4" stroke={GRID} />
				<XAxis
					dataKey="hour"
					tickLine={false}
					axisLine={false}
					tickMargin={6}
					interval={2}
					tickFormatter={(hour: number) => String(hour).padStart(2, '0')}
				/>
				<YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(seconds: number) => formatHours(seconds)} />
				<ChartTooltip
					cursor={{ fill: 'oklch(1 0 0 / 4%)' }}
					content={({ active, payload }) => {
						const hour = active ? (payload?.[0]?.payload as InsightsView['hours'][number] | undefined) : undefined;
						if (!hour) return null;
						return (
							<Tip
								title={`${String(hour.hour).padStart(2, '0')}:00 – ${String(hour.hour + 1).padStart(2, '0')}:00`}
								rows={[
									{ name: 'Total', value: formatDuration(hour.seconds) },
									{ name: 'Per active day', value: formatDuration(hour.average) },
								]}
							/>
						);
					}}
				/>
				<Bar dataKey="seconds" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
			</BarChart>
		</ChartContainer>
	);
}

export function LanguagesOverTime({ data, names }: { data: InsightsView['languagesOverTime']; names: string[] }) {
	const rows = data.map((bucket) => ({
		label: bucket.label,
		...Object.fromEntries(names.map((name, i) => [`s${i}`, bucket.series[name]])),
	}));

	return (
		<ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
			<AreaChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
				<CartesianGrid vertical={false} strokeDasharray="2 4" stroke={GRID} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={6}
					minTickGap={24}
					tickFormatter={labelText}
				/>
				<YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(seconds: number) => formatHours(seconds)} />
				<ChartTooltip
					content={({ active, payload, label }) => {
						if (!active || !payload?.length) return null;
						return (
							<Tip
								title={labelText(String(label))}
								rows={names
									.map((name, i) => ({
										name,
										value: Number((payload[0].payload as Record<string, number>)[`s${i}`] ?? 0),
										color: seriesColor(i),
									}))
									.filter((row) => row.value > 0)
									.reverse()
									.map((row) => ({ ...row, value: formatDuration(row.value) }))}
							/>
						);
					}}
				/>
				{names.map((name, i) => (
					<Area
						key={name}
						type="monotone"
						dataKey={`s${i}`}
						name={name}
						stackId="languages"
						stroke={seriesColor(i)}
						fill={seriesColor(i)}
						fillOpacity={0.28}
						strokeWidth={1.25}
					/>
				))}
			</AreaChart>
		</ChartContainer>
	);
}

export function AiLinesChart({ data }: { data: InsightsView['ai'] }) {
	return (
		<ChartContainer config={{}} className="aspect-auto h-[180px] w-full">
			<BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -12 }} barCategoryGap={2}>
				<CartesianGrid vertical={false} strokeDasharray="2 4" stroke={GRID} />
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
					cursor={{ fill: 'oklch(1 0 0 / 4%)' }}
					content={({ active, payload }) => {
						const point = active ? (payload?.[0]?.payload as InsightsView['ai'][number] | undefined) : undefined;
						if (!point) return null;
						return (
							<Tip
								title={labelText(point.label)}
								rows={[
									{ name: 'AI lines', value: point.ai.toLocaleString(), color: 'var(--chart-3)' },
									{ name: 'Human lines', value: point.human.toLocaleString(), color: 'var(--chart-4)' },
								]}
							/>
						);
					}}
				/>
				<Bar dataKey="ai" stackId="lines" fill="var(--chart-3)" />
				<Bar dataKey="human" stackId="lines" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
			</BarChart>
		</ChartContainer>
	);
}
