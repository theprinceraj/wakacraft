import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { PageSkeleton } from '@/components/app/states';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { BreakdownBar } from '@/components/dashboard/breakdown-bar';
import { projectColor, seriesColor } from '@/components/dashboard/colors';
import { DailyChart } from '@/components/dashboard/daily-chart';
import { FirstRun } from '@/components/dashboard/first-run';
import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatRow, StatTile } from '@/components/dashboard/stat-tile';
import { Timeline } from '@/components/dashboard/timeline';
import { WeekdayBars } from '@/components/dashboard/weekday-bars';
import { requireSession } from '@/lib/auth/session';
import { getBaseUrl } from '@/lib/base-url';
import { formatCategory, formatDay, formatDuration, formatRangeLabel } from '@/lib/format';
import { todayIn } from '@/lib/util/Time';
import { dashboardService, isDashboardRange, type DashboardView } from '@/server/dashboard/dashboard.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

const TIMELINE_ID = 'timeline';

const relativeChange = (current: number, previous: number) => (previous > 0 ? (current - previous) / previous : null);

export default function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
	return (
		<Suspense fallback={<PageSkeleton />}>
			<Dashboard searchParams={searchParams} />
		</Suspense>
	);
}

async function Dashboard({ searchParams }: Pick<PageProps<'/dashboard'>, 'searchParams'>) {
	const session = await requireSession('/dashboard');
	const params = await searchParams;
	const slug = isDashboardRange(params.range) ? params.range : '7d';
	const day = typeof params.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : undefined;

	const view = await dashboardService.getView(session.user.id, slug, day);
	const today = todayIn(view.timezone);
	const { totals } = view;

	if (!view.hasAnyActivity) {
		return (
			<>
				<PageHeader
					eyebrow={`Welcome, ${session.user.name.split(' ')[0]}`}
					title="Connect your editor to start tracking"
					description="wakacraft records your time automatically from editor heartbeats. There's nothing to start or stop."
					className="mb-8"
				/>
				<FirstRun apiUrl={`${await getBaseUrl()}/api/v1`} />
			</>
		);
	}

	const colorFor = (name: string, index: number) => projectColor(name, index, view.projectColors);
	const rangeLabel = formatRangeLabel(view.range.label);

	return (
		<>
			<PageHeader
				title={rangeLabel}
				description={
					<span className="font-mono text-[13px]">
						{view.range.start === view.range.end
							? formatDay(view.range.start, { weekday: 'long', month: 'short', day: 'numeric' })
							: `${formatDay(view.range.start)} – ${formatDay(view.range.end)}`}
						{' · '}
						{view.timezone}
					</span>
				}
				actions={<RangePicker value={slug} />}
			/>

			<div className="flex flex-col gap-4">
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<Panel
						label="Your last 12 months"
						description="Select a day to see its timeline below."
						tone="ink"
						className="lg:col-span-8"
					>
						<ActivityHeatmap days={view.heatmap} pickable selected={day} timelineId={TIMELINE_ID} />
						<dl className="mt-5 grid grid-cols-3 gap-4 border-t pt-5">
							{[
								[view.heatmap.filter((entry) => entry.seconds > 0).length, 'days coded'],
								[totals.streakDays, 'day streak'],
								[totals.longestStreakDays, 'longest streak'],
							].map(([value, label]) => (
								<div key={label} className="flex flex-col-reverse">
									<dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
									<dd className="text-[clamp(1.375rem,3vw,1.875rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
										{value}
									</dd>
								</div>
							))}
						</dl>
					</Panel>
					<TodayCard view={view} />
				</div>

				<StatRow>
					<StatTile
						label={rangeLabel}
						value={formatDuration(totals.rangeSeconds)}
						hint={`${totals.activeDays} of ${view.range.days} days active`}
					/>
					<StatTile
						label="Daily average"
						value={formatDuration(totals.dailyAverageSeconds)}
						hint="Across active days"
					/>
					<StatTile
						label="Best day"
						value={totals.bestDay ? formatDuration(totals.bestDay.seconds) : '—'}
						hint={
							totals.bestDay
								? formatDay(totals.bestDay.date, { weekday: 'short', month: 'short', day: 'numeric' })
								: 'No activity yet'
						}
					/>
					<StatTile
						label="Top language"
						value={view.languages[0]?.name ?? '—'}
						hint={view.languages[0] ? formatDuration(view.languages[0].seconds) : 'No activity yet'}
					/>
				</StatRow>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<Panel
						label="Time by project"
						description={`${formatDuration(totals.rangeSeconds)} in total`}
						className="lg:col-span-8"
					>
						{totals.rangeSeconds === 0 ? (
							<PanelEmpty />
						) : view.range.days === 1 ? (
							// One column isn't a chart, so a single day becomes one bar split by project.
							<BreakdownBar items={view.projects} colorFor={colorFor} barClassName="h-3" />
						) : (
							<DailyChart daily={view.daily} seriesNames={view.seriesNames} projectColors={view.projectColors} />
						)}
					</Panel>
					<Panel label="Languages" className="lg:col-span-4">
						<BreakdownBar items={view.languages} />
					</Panel>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<Panel id={TIMELINE_ID} label="Timeline" className="scroll-mt-20 lg:col-span-8">
						<Timeline
							timeline={view.timeline}
							timezone={view.timezone}
							today={today}
							projectColors={view.projectColors}
						/>
					</Panel>
					<Panel label="By weekday" meta={rangeLabel} className="lg:col-span-4">
						<WeekdayBars weekdays={view.weekdays} weekStartDay={view.weekStartDay} />
					</Panel>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
					<Panel
						label="Projects"
						className="md:col-span-2 lg:col-span-6"
						meta={
							<Link
								href="/projects"
								className="font-medium text-foreground underline decoration-ember decoration-2 underline-offset-[6px] hover:text-ember-text"
							>
								all projects
							</Link>
						}
					>
						<RankedList
							items={view.projects}
							limit={8}
							colorFor={colorFor}
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

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
					<Panel label="Machines" className="lg:col-span-4">
						<RankedList items={view.machines} limit={4} />
					</Panel>
					<Panel label="Operating systems" className="lg:col-span-4">
						<RankedList items={view.operatingSystems} limit={4} />
					</Panel>
					{totals.aiLineChanges + totals.humanLineChanges > 0 ? (
						<Panel label="AI and hand-written lines" className="md:col-span-2 lg:col-span-4">
							<AiSplit ai={totals.aiLineChanges} human={totals.humanLineChanges} />
						</Panel>
					) : null}
				</div>
			</div>
		</>
	);
}

/** The homepage's orange card, with today's real numbers. The one hero figure on the page. */
function TodayCard({ view }: { view: DashboardView }) {
	const { todaySeconds, yesterdaySeconds } = view.totals;
	const change = relativeChange(todaySeconds, yesterdaySeconds);
	const languages = view.todayLanguages.slice(0, 3);
	const ChangeIcon = change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;

	return (
		<section className="tile tile-ember flex min-w-0 flex-col justify-between gap-6 p-5.5 sm:p-7 lg:col-span-4">
			<div className="flex items-center justify-between text-[13px]">
				<h2>Today</h2>
				{change !== null ? (
					<span
						className="inline-flex items-center gap-0.5 tabular-nums"
						title={`${Math.abs(Math.round(change * 100))}% ${change < 0 ? 'less' : 'more'} than yesterday`}
					>
						<ChangeIcon className="size-3.5" aria-hidden />
						{Math.abs(Math.round(change * 100))}%
					</span>
				) : null}
			</div>
			<div>
				<p className="text-[clamp(3.25rem,7vw,4.25rem)] leading-none font-semibold tracking-[-0.04em] text-on-ember-strong">
					{formatDuration(todaySeconds)}
				</p>
				<p className="mt-2 text-[13px] text-muted-foreground">Yesterday {formatDuration(yesterdaySeconds)}</p>
				{languages.length ? (
					<ul className="mt-6 flex flex-col gap-2.5 text-[13px]">
						{languages.map((language) => (
							<li key={language.name}>
								<div className="flex justify-between gap-3">
									<span className="truncate">{language.name}</span>
									<span className="tabular-nums">{formatDuration(language.seconds)}</span>
								</div>
								<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
									<div className="h-full rounded-full bg-bar" style={{ width: `${language.percent}%` }} />
								</div>
							</li>
						))}
					</ul>
				) : (
					<p className="mt-6 text-[13px]">Nothing yet today. Your editor will fill this in.</p>
				)}
			</div>
		</section>
	);
}

function AiSplit({ ai, human }: { ai: number; human: number }) {
	const total = ai + human;
	return (
		<div>
			<p className="text-[clamp(1.375rem,2.6vw,1.875rem)] leading-[1.15] font-semibold tracking-[-0.03em]">
				{Math.round((ai / total) * 100)}% with AI
			</p>
			<div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
				<div style={{ flexGrow: ai, background: seriesColor(3) }} />
				<div style={{ flexGrow: human, background: seriesColor(1) }} />
			</div>
			<ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
				<li className="flex items-center gap-1.75">
					<span className="size-2.5 rounded-[3px]" style={{ background: seriesColor(3) }} />
					AI <span className="font-medium text-foreground tabular-nums">{ai.toLocaleString()}</span>
				</li>
				<li className="flex items-center gap-1.75">
					<span className="size-2.5 rounded-[3px]" style={{ background: seriesColor(1) }} />
					Hand-written <span className="font-medium text-foreground tabular-nums">{human.toLocaleString()}</span>
				</li>
			</ul>
		</div>
	);
}
