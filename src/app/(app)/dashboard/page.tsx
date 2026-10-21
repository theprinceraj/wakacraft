import Link from 'next/link';
import { Suspense } from 'react';

import { EditorSetup } from '@/components/app/editor-setup';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { projectColor, seriesColor } from '@/components/dashboard/colors';
import { DailyChart } from '@/components/dashboard/daily-chart';
import { Donut } from '@/components/dashboard/donut';
import { Panel, PanelEmpty } from '@/components/dashboard/panel';
import { RangePicker } from '@/components/dashboard/range-picker';
import { RankedList } from '@/components/dashboard/ranked-list';
import { StatTile } from '@/components/dashboard/stat-tile';
import { Timeline } from '@/components/dashboard/timeline';
import { WeekdayBars } from '@/components/dashboard/weekday-bars';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { getBaseUrl } from '@/lib/base-url';
import { formatDay, formatDuration } from '@/lib/format';
import { todayIn } from '@/lib/util/Time';
import { dashboardService, isDashboardRange } from '@/server/dashboard/dashboard.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

const relativeChange = (current: number, previous: number) => (previous > 0 ? (current - previous) / previous : null);
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export default function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<Dashboard searchParams={searchParams} />
		</Suspense>
	);
}

function DashboardSkeleton() {
	return (
		<div className="flex animate-pulse flex-col gap-3" aria-busy aria-label="Loading dashboard">
			<div className="h-11" />
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
				{Array.from({ length: 6 }, (_, index) => (
					<div key={index} className="h-[92px] rounded-lg border bg-card/50" />
				))}
			</div>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<div className="h-56 rounded-lg border bg-card/50 lg:col-span-8" />
				<div className="h-56 rounded-lg border bg-card/50 lg:col-span-4" />
			</div>
			<div className="h-72 rounded-lg border bg-card/50" />
		</div>
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
			<div className="mx-auto flex max-w-2xl flex-col gap-6 py-10">
				<div>
					<p className="text-[10.5px] tracking-[0.14em] text-ember uppercase">
						Welcome, {session.user.name.split(' ')[0]}
					</p>
					<h1 className="mt-2 text-2xl font-semibold tracking-tight">Connect your editor to start tracking</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						wakacraft records time automatically from editor heartbeats. Nothing to start or stop.
					</p>
				</div>
				<Panel label="Setup">
					<EditorSetup apiUrl={`${await getBaseUrl()}/api/v1`} />
				</Panel>
				<Button asChild className="self-start">
					<Link href="/settings#api-keys">Create an API key</Link>
				</Button>
			</div>
		);
	}

	const colorFor = (name: string, index: number) => projectColor(name, index, view.projectColors);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-end justify-between gap-3 pb-1">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Overview</h1>
					<p className="tabular text-xs text-muted-foreground">
						{view.range.start === view.range.end
							? formatDay(view.range.start, { weekday: 'long', month: 'short', day: 'numeric' })
							: `${formatDay(view.range.start)} – ${formatDay(view.range.end)}`}
						<span className="mx-1.5 text-muted-foreground/40">·</span>
						{view.timezone}
					</p>
				</div>
				<RangePicker value={slug} />
			</div>

			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
				<StatTile
					label="Today"
					value={formatDuration(totals.todaySeconds)}
					delta={relativeChange(totals.todaySeconds, totals.yesterdaySeconds)}
					hint={`Yesterday ${formatDuration(totals.yesterdaySeconds)}`}
					accent
				/>
				<StatTile
					label={view.range.label}
					value={formatDuration(totals.rangeSeconds)}
					hint={`${totals.activeDays} of ${view.range.days} days active`}
				/>
				<StatTile label="Daily avg" value={formatDuration(totals.dailyAverageSeconds)} hint="Across active days" />
				<StatTile
					label="Streak"
					value={`${totals.streakDays}d`}
					hint={`Longest ${totals.longestStreakDays}d in 12 months`}
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
			</div>

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<Panel
					label="Activity · 12 months"
					className="lg:col-span-8"
					meta={plural(view.heatmap.filter((d) => d.seconds > 0).length, 'active day')}
				>
					<ActivityHeatmap days={view.heatmap} />
				</Panel>
				<Panel label="Languages" className="lg:col-span-4">
					<Donut items={view.languages} />
				</Panel>
			</div>

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<Panel label="Daily · by project" className="lg:col-span-8" meta={formatDuration(totals.rangeSeconds)}>
					{totals.rangeSeconds > 0 ? (
						<DailyChart daily={view.daily} seriesNames={view.seriesNames} projectColors={view.projectColors} />
					) : (
						<PanelEmpty />
					)}
				</Panel>
				<Panel label="Editors" className="lg:col-span-4">
					<Donut items={view.editors} />
				</Panel>
			</div>

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
				<Panel
					label="Timeline"
					className="lg:col-span-8"
					meta={view.timeline.lanes.length ? plural(view.timeline.lanes.length, 'project') : undefined}
				>
					<Timeline
						timeline={view.timeline}
						timezone={view.timezone}
						today={today}
						projectColors={view.projectColors}
					/>
				</Panel>
				<Panel label="Weekdays" className="lg:col-span-4">
					<WeekdayBars weekdays={view.weekdays} weekStartDay={view.weekStartDay} />
				</Panel>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
				<Panel label="Projects" className="md:col-span-2 lg:col-span-6" meta={`${view.projects.length} total`}>
					<RankedList items={view.projects} limit={10} colorFor={colorFor} />
				</Panel>
				<Panel label="Categories" className="lg:col-span-3">
					<RankedList items={view.categories} limit={6} colorFor={(_name, index) => seriesColor(index + 1)} />
				</Panel>
				<Panel label="Machines & OS" className="lg:col-span-3" bodyClassName="flex flex-col gap-4">
					<RankedList items={view.machines} limit={4} colorFor={() => 'var(--chart-7)'} />
					<RankedList items={view.operatingSystems} limit={3} colorFor={() => 'var(--chart-3)'} />
				</Panel>
			</div>

			{totals.aiLineChanges + totals.humanLineChanges > 0 ? (
				<Panel label="Line changes · AI vs human" meta={view.range.label}>
					<AiSplit ai={totals.aiLineChanges} human={totals.humanLineChanges} />
				</Panel>
			) : null}
		</div>
	);
}

function AiSplit({ ai, human }: { ai: number; human: number }) {
	const total = ai + human;
	return (
		<div className="flex flex-col gap-2">
			<div className="flex h-2 overflow-hidden rounded-full bg-white/5">
				<div className="bg-chart-3" style={{ width: `${(ai / total) * 100}%` }} />
				<div className="bg-chart-4" style={{ width: `${(human / total) * 100}%` }} />
			</div>
			<div className="tabular flex justify-between text-xs">
				<span>
					<span className="mr-1.5 inline-block size-2 rounded-[2px] bg-chart-3" />
					AI {ai.toLocaleString()} lines
				</span>
				<span>
					Human {human.toLocaleString()} lines
					<span className="ml-1.5 inline-block size-2 rounded-[2px] bg-chart-4" />
				</span>
			</div>
		</div>
	);
}
