import { ArrowRight, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { EmptyState, PageSkeleton } from '@/components/app/states';
import { seriesColor } from '@/components/dashboard/colors';
import { ColumnBars } from '@/components/dashboard/column-bars';
import { Panel } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatRow, StatTile } from '@/components/dashboard/stat-tile';
import { AiLinesChart, LanguagesOverTime, TrendChart } from '@/components/insights/insight-charts';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { formatCategory, formatDay, formatDuration, formatRangeLabel } from '@/lib/format';
import { getInsightsView, isInsightRange } from '@/server/insight/insights-view';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Insights' };

const RANGE_OPTIONS = [
	{ value: 'last_7_days', label: '7 days' },
	{ value: 'last_30_days', label: '30 days' },
	{ value: 'last_6_months', label: '6 months' },
	{ value: 'last_year', label: '1 year' },
	{ value: 'all_time', label: 'All time' },
];

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const fullDate = { month: 'short', day: 'numeric', year: 'numeric' } as const;

export default function InsightsPage({ searchParams }: PageProps<'/insights'>) {
	return (
		<Suspense fallback={<PageSkeleton />}>
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
	const aiTotal = view.ai.reduce((sum, point) => sum + point.ai, 0);
	const humanTotal = view.ai.reduce((sum, point) => sum + point.human, 0);
	const rangeLabel = formatRangeLabel(view.range.label);
	const widestWeekday = Math.max(1, ...view.weekdays.map((day) => day.average));

	return (
		<>
			<PageHeader
				title="Insights"
				description={
					<span className="font-mono text-[13px]">
						{rangeLabel} · {formatDay(view.range.start, fullDate)} – {formatDay(view.range.end, fullDate)}
					</span>
				}
				actions={<RangePicker value={key} options={RANGE_OPTIONS} />}
			/>

			{empty ? (
				<EmptyState
					icon={Lightbulb}
					title="No activity in this range yet"
					action={
						<Button asChild size="lg">
							<Link href="/dashboard">
								Back to the dashboard <ArrowRight />
							</Link>
						</Button>
					}
				>
					Insights need a few days of coding to find your patterns. Try a wider range, or write some code first.
				</EmptyState>
			) : (
				<div className="flex flex-col gap-4">
					{view.peakWeekday && view.peakHour !== null ? (
						<section className="tile tile-ink p-5.5 sm:p-7">
							<p className="text-[13px] text-muted-foreground">Your rhythm</p>
							<p className="mt-2 text-[clamp(1.625rem,4vw,2.625rem)] leading-[1.12] font-medium tracking-[-0.03em] text-balance">
								You code most on <span className="text-on-ink-ember">{view.peakWeekday}s</span>, and your peak hour
								starts at <span className="text-on-ink-ember">{hourLabel(view.peakHour)}</span>.
							</p>
						</section>
					) : null}

					<StatRow>
						<StatTile label="Total" value={formatDuration(view.totals.seconds)} hint={rangeLabel} />
						<StatTile
							label="Daily average"
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
					</StatRow>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
						<Panel label="Trend" description="Each day against your trailing average." className="lg:col-span-8">
							<TrendChart trend={view.trend} />
						</Panel>
						<Panel label="Weekday averages" className="lg:col-span-4">
							<RankedList
								items={view.weekdays.map((day) => ({
									name: day.name,
									seconds: day.average,
									percent: (day.average / widestWeekday) * 100,
								}))}
								limit={7}
								showPercent={false}
							/>
						</Panel>
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<Panel label="Time of day" description={rangeLabel}>
							<ColumnBars
								height={190}
								maxBarWidth={16}
								labelEvery={3}
								items={view.hours.map((hour) => ({
									key: hour.hour,
									label: String(hour.hour).padStart(2, '0'),
									title: `${hourLabel(hour.hour)} to ${hourLabel((hour.hour + 1) % 24)}`,
									seconds: hour.seconds,
									detail: `${formatDuration(hour.average)} per active day`,
								}))}
							/>
						</Panel>
						<Panel label="Languages over time">
							<LanguagesOverTime data={view.languagesOverTime} names={view.languageNames} />
						</Panel>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
						<Panel label="Projects" className="md:col-span-2 lg:col-span-6">
							<RankedList
								items={view.projects}
								limit={8}
								colorFor={(name, index) => seriesColor(index, name)}
								hrefFor={(name) => `/projects/${encodeURIComponent(name)}`}
							/>
						</Panel>
						<Panel label="Editors" className="lg:col-span-3">
							<RankedList items={view.editors} limit={6} />
						</Panel>
						<Panel label="Categories" className="lg:col-span-3">
							<RankedList items={view.categories} limit={6} renderName={formatCategory} />
						</Panel>
					</div>

					{hasAi ? (
						<Panel
							label="AI and hand-written lines"
							description={`${Math.round((aiTotal / Math.max(1, aiTotal + humanTotal)) * 100)}% of changed lines in this range came with AI assistance.`}
						>
							<AiLinesChart data={view.ai} />
						</Panel>
					) : null}
				</div>
			)}
		</>
	);
}
