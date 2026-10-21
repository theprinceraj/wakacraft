import { Suspense } from 'react';

import { seriesColor } from '@/components/dashboard/colors';
import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatTile } from '@/components/dashboard/stat-tile';
import { AiLinesChart, HoursChart, LanguagesOverTime, TrendChart } from '@/components/insights/insight-charts';
import { requireSession } from '@/lib/auth/session';
import { formatDay, formatDuration } from '@/lib/format';
import { getInsightsView, InsightRanges, isInsightRange } from '@/server/insight/insights-view';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Insights' };

const RANGE_OPTIONS = Object.entries(InsightRanges).map(([value, label]) => ({ value, label }));

export default function InsightsPage({ searchParams }: PageProps<'/insights'>) {
	return (
		<Suspense fallback={<div className="h-[600px] animate-pulse rounded-lg border bg-card/50" />}>
			<Insights searchParams={searchParams} />
		</Suspense>
	);
}

async function Insights({ searchParams }: Pick<PageProps<'/insights'>, 'searchParams'>) {
	const session = await requireSession('/insights');
	const { range } = await searchParams;
	const key = isInsightRange(range) ? range : 'last_30_days';
	const view = await getInsightsView(session.user.id, key);
	const empty = view.totals.seconds === 0;
	const hasAi = view.ai.some((point) => point.ai + point.human > 0);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-end justify-between gap-3 pb-1">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Insights</h1>
					<p className="tabular text-xs text-muted-foreground">
						{view.range.label} · {formatDay(view.range.start, { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
						{formatDay(view.range.end, { month: 'short', day: 'numeric', year: 'numeric' })}
					</p>
				</div>
				<RangePicker value={key} options={RANGE_OPTIONS} />
			</div>

			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
				<StatTile label="Total" value={formatDuration(view.totals.seconds)} accent />
				<StatTile
					label="Daily avg"
					value={formatDuration(view.totals.dailyAverageSeconds)}
					hint={`${view.totals.activeDays} active days`}
				/>
				<StatTile
					label="Consistency"
					value={`${view.range.days ? Math.round((view.totals.activeDays / view.range.days) * 100) : 0}%`}
					hint={`of ${view.range.days} days`}
				/>
				<StatTile
					label="Best day"
					value={view.bestDay ? formatDuration(view.bestDay.total_seconds) : '—'}
					hint={
						view.bestDay
							? formatDay(view.bestDay.date, { weekday: 'short', month: 'short', day: 'numeric' })
							: undefined
					}
				/>
				<StatTile
					label="Peak hour"
					value={view.peakHour === null ? '—' : `${String(view.peakHour).padStart(2, '0')}:00`}
					hint="Most coding happens here"
				/>
				<StatTile label="Strongest day" value={view.peakWeekday ?? '—'} hint="Highest weekday average" />
			</div>

			{empty ? (
				<Panel label="Insights">
					<PanelEmpty>No activity in this range yet</PanelEmpty>
				</Panel>
			) : (
				<>
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
						<Panel label="Trend" className="lg:col-span-8" meta="with trailing average">
							<TrendChart trend={view.trend} />
						</Panel>
						<Panel label="Weekday averages" className="lg:col-span-4">
							<RankedList
								items={view.weekdays.map((day) => ({
									name: day.name,
									seconds: day.average,
									percent: (day.average / Math.max(1, ...view.weekdays.map((d) => d.average))) * 100,
								}))}
								limit={7}
								colorFor={() => 'var(--chart-2)'}
							/>
						</Panel>
					</div>

					<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
						<Panel label="Time of day" className="lg:col-span-6" meta={view.range.label}>
							<HoursChart hours={view.hours} />
						</Panel>
						<Panel label="Languages over time" className="lg:col-span-6">
							<LanguagesOverTime data={view.languagesOverTime} names={view.languageNames} />
						</Panel>
					</div>

					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
						<Panel label="Projects" className="md:col-span-2 lg:col-span-6">
							<RankedList items={view.projects} limit={8} colorFor={(_name, index) => seriesColor(index)} />
						</Panel>
						<Panel label="Editors" className="lg:col-span-3">
							<RankedList items={view.editors} limit={6} colorFor={() => 'var(--chart-7)'} />
						</Panel>
						<Panel label="Categories" className="lg:col-span-3">
							<RankedList items={view.categories} limit={6} colorFor={(_name, index) => seriesColor(index + 2)} />
						</Panel>
					</div>

					{hasAi ? (
						<Panel label="Line changes · AI vs human">
							<AiLinesChart data={view.ai} />
						</Panel>
					) : null}
				</>
			)}
		</div>
	);
}
