import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { chipClass } from '@/components/app/chip';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState, PageSkeleton } from '@/components/app/states';
import { seriesColor } from '@/components/dashboard/colors';
import { ColumnBars } from '@/components/dashboard/column-bars';
import { Panel } from '@/components/dashboard/panel';
import { StatTile } from '@/components/dashboard/stat-tile';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { formatDay, formatDuration } from '@/lib/format';
import { wrappedService } from '@/server/wrapped/wrapped.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Wrapped' };

export default function WrappedPage({ searchParams }: PageProps<'/wrapped'>) {
	return (
		<Suspense fallback={<PageSkeleton />}>
			<Wrapped searchParams={searchParams} />
		</Suspense>
	);
}

const hours = (seconds: number) => Math.round(seconds / 3600).toLocaleString();

function Ranked({
	items,
	colored = true,
}: {
	items: { name: string; seconds: number; percent: number }[];
	colored?: boolean;
}) {
	return (
		<ol className="flex flex-col gap-3">
			{items.map((item, index) => (
				<li key={item.name} className="flex items-center gap-3">
					<span className="w-4.5 text-lg font-medium text-muted-foreground tabular-nums">{index + 1}</span>
					{colored ? (
						<span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: seriesColor(index, item.name) }} />
					) : null}
					<span className="min-w-0 flex-1 truncate text-base">{item.name}</span>
					<span className="text-[13px] text-muted-foreground tabular-nums">{hours(item.seconds)}h</span>
				</li>
			))}
		</ol>
	);
}

async function Wrapped({ searchParams }: Pick<PageProps<'/wrapped'>, 'searchParams'>) {
	const session = await requireSession('/wrapped');
	const { year: yearParam } = await searchParams;
	const years = await wrappedService.years(session.user.id);
	const requested = Number(yearParam);
	const year = years.includes(requested) ? requested : years[0];
	const view = await wrappedService.getView(session.user.id, year);
	const change =
		view.previousYearSeconds && view.previousYearSeconds > 0
			? (view.totalSeconds - view.previousYearSeconds) / view.previousYearSeconds
			: null;
	const totalLines = view.aiLineChanges + view.humanLineChanges;

	return (
		<div className="mx-auto max-w-5xl">
			<PageHeader
				eyebrow="wakacraft wrapped"
				title={`Your ${year} in code`}
				actions={
					years.length > 1 ? (
						<nav className="scroll-x-quiet flex max-w-full gap-1.5" aria-label="Year">
							{years.map((item) => (
								<Link
									key={item}
									href={`/wrapped?year=${item}`}
									aria-current={item === year ? 'true' : undefined}
									className={chipClass(item === year)}
								>
									{item}
								</Link>
							))}
						</nav>
					) : undefined
				}
			/>

			{view.totalSeconds === 0 ? (
				<EmptyState
					icon={Sparkles}
					title={`No coding recorded in ${year} yet`}
					action={
						<Button asChild size="lg">
							<Link href="/settings#editor">
								Connect your editor <ArrowRight />
							</Link>
						</Button>
					}
				>
					Your Wrapped builds itself from your activity. Come back once you&apos;ve written some code.
				</EmptyState>
			) : (
				<div className="flex flex-col gap-4">
					<section className="tile tile-ember flex flex-col gap-7 px-5.5 py-8 sm:px-7 sm:py-9">
						<p className="text-[13px] text-muted-foreground">Total</p>
						<p className="text-[clamp(4rem,13vw,9.25rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-on-ember-strong">
							{hours(view.totalSeconds)} hours
						</p>
						<p className="max-w-[58ch] text-base">
							Across <b className="font-semibold">{view.activeDays} days</b> of {view.daysInRange}, with{' '}
							<b className="font-semibold">{formatDuration(view.dailyAverageSeconds)}</b> on an average coding day.
							{change !== null
								? ` That's ${change >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(change * 100))}% from ${year - 1}.`
								: ''}
						</p>
					</section>

					<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
						<StatTile label="Longest streak" value={`${view.longestStreak} days`} hint="in a row" />
						<StatTile
							label="Best day"
							value={view.bestDay ? formatDuration(view.bestDay.total_seconds) : '—'}
							hint={
								view.bestDay
									? formatDay(view.bestDay.date, { weekday: 'long', month: 'long', day: 'numeric' })
									: undefined
							}
						/>
						<StatTile
							label="Peak hour"
							value={view.peakHour === null ? '—' : `${String(view.peakHour).padStart(2, '0')}:00`}
							hint={view.peakWeekday ? `${view.peakWeekday}s were your strongest` : undefined}
							className="max-md:col-span-2"
						/>
					</div>

					<Panel label={view.busiestMonth ? `Busiest month: ${view.busiestMonth.name}` : 'Months'} tone="ink">
						<ColumnBars
							height={180}
							maxBarWidth={36}
							format={(seconds) => `${hours(seconds)}h`}
							items={view.months.map((month) => ({
								key: month.name,
								label: month.name.slice(0, 3),
								title: month.name,
								seconds: month.seconds,
							}))}
						/>
					</Panel>

					<div className="grid gap-4 md:grid-cols-2">
						<Panel label="Top languages">
							<Ranked items={view.languages} />
							{view.newLanguages.length ? (
								<p className="mt-4 text-[13px] text-muted-foreground">
									<span className="font-medium text-foreground">New this year:</span>{' '}
									{view.newLanguages.slice(0, 5).join(', ')}
								</p>
							) : null}
						</Panel>
						<Panel label="Top projects">
							<Ranked items={view.projects} />
						</Panel>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Panel label="Editors">
							<Ranked items={view.editors} colored={false} />
						</Panel>
						{totalLines > 0 ? (
							<Panel label="Lines changed">
								<p className="text-[clamp(2.5rem,6vw,3.5rem)] leading-none font-semibold tracking-[-0.04em]">
									{totalLines.toLocaleString()}
								</p>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{Math.round((view.aiLineChanges / totalLines) * 100)}% with AI assistance
								</p>
							</Panel>
						) : null}
					</div>
				</div>
			)}
		</div>
	);
}
