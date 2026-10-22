import Link from 'next/link';
import { Suspense } from 'react';

import { seriesColor } from '@/components/dashboard/colors';
import { requireSession } from '@/lib/auth/session';
import { formatDay, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { wrappedService } from '@/server/wrapped/wrapped.service';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Wrapped' };

export default function WrappedPage({ searchParams }: PageProps<'/wrapped'>) {
	return (
		<Suspense fallback={<div className="h-[600px] animate-pulse rounded-lg border bg-card/50" />}>
			<Wrapped searchParams={searchParams} />
		</Suspense>
	);
}

const hours = (seconds: number) => Math.round(seconds / 3600).toLocaleString();

function Card({ eyebrow, children, className }: { eyebrow: string; children: ReactNode; className?: string }) {
	return (
		<section className={cn('flex flex-col gap-3 rounded-xl border bg-card/80 p-6', className)}>
			<p className="text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">{eyebrow}</p>
			{children}
		</section>
	);
}

function Ranked({ items }: { items: { name: string; seconds: number; percent: number }[] }) {
	return (
		<ol className="flex flex-col gap-2.5">
			{items.map((item, index) => (
				<li key={item.name} className="flex items-center gap-3">
					<span className="tabular w-5 text-lg text-muted-foreground">{index + 1}</span>
					<span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: seriesColor(index) }} />
					<span className="min-w-0 flex-1 truncate text-base">{item.name}</span>
					<span className="tabular text-sm text-muted-foreground">{hours(item.seconds)}h</span>
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
	const maxMonth = Math.max(1, ...view.months.map((month) => month.seconds));
	const change =
		view.previousYearSeconds && view.previousYearSeconds > 0
			? (view.totalSeconds - view.previousYearSeconds) / view.previousYearSeconds
			: null;

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="tabular text-xs tracking-[0.16em] text-ember uppercase">wakacraft wrapped</p>
					<h1 className="text-4xl font-semibold tracking-tight">Your {year} in code</h1>
				</div>
				<nav className="flex gap-1">
					{years.map((item) => (
						<Link
							key={item}
							href={`/wrapped?year=${item}`}
							className={cn(
								'tabular rounded-md border px-2.5 py-1 text-xs text-muted-foreground',
								item === year && 'border-ember/60 bg-ember/10 text-ember',
							)}
						>
							{item}
						</Link>
					))}
				</nav>
			</div>

			{view.totalSeconds === 0 ? (
				<Card eyebrow={String(year)}>
					<p className="text-sm text-muted-foreground">No coding recorded in {year} yet.</p>
				</Card>
			) : (
				<>
					<Card
						eyebrow="Total"
						className="bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_oklab,var(--ember)_16%,transparent),transparent_60%)]"
					>
						<p className="tabular text-6xl leading-none font-semibold text-ember sm:text-7xl">
							{hours(view.totalSeconds)} hours
						</p>
						<p className="text-sm text-muted-foreground">
							across {view.activeDays} days of {view.daysInRange} · {formatDuration(view.dailyAverageSeconds)} on an
							average coding day
							{change !== null ? (
								<span className={change >= 0 ? 'text-success' : 'text-destructive'}>
									{' '}
									· {change >= 0 ? '+' : ''}
									{Math.round(change * 100)}% vs {year - 1}
								</span>
							) : null}
						</p>
					</Card>

					<div className="grid gap-4 sm:grid-cols-3">
						<Card eyebrow="Longest streak">
							<p className="tabular text-4xl font-semibold">{view.longestStreak} days</p>
						</Card>
						<Card eyebrow="Best day">
							<p className="tabular text-4xl font-semibold">
								{view.bestDay ? formatDuration(view.bestDay.total_seconds) : '—'}
							</p>
							{view.bestDay ? (
								<p className="text-xs text-muted-foreground">
									{formatDay(view.bestDay.date, { weekday: 'long', month: 'long', day: 'numeric' })}
								</p>
							) : null}
						</Card>
						<Card eyebrow="Peak hour">
							<p className="tabular text-4xl font-semibold">
								{view.peakHour === null ? '—' : `${String(view.peakHour).padStart(2, '0')}:00`}
							</p>
							<p className="text-xs text-muted-foreground">
								{view.peakWeekday ? `${view.peakWeekday}s were your strongest` : null}
							</p>
						</Card>
					</div>

					<Card eyebrow={view.busiestMonth ? `Busiest month · ${view.busiestMonth.name}` : 'Months'}>
						<div className="grid h-40 grid-cols-12 items-end gap-2">
							{view.months.map((month) => (
								<div key={month.name} className="flex h-full flex-col items-center justify-end gap-1.5">
									<div
										className={cn(
											'w-full rounded-t-[3px]',
											month.name === view.busiestMonth?.name ? 'bg-ember' : 'bg-chart-2/70',
										)}
										style={{ height: `${Math.max(month.seconds ? 3 : 1, (month.seconds / maxMonth) * 100)}%` }}
										title={`${month.name}: ${hours(month.seconds)}h`}
									/>
									<span className="text-[10px] text-muted-foreground">{month.name.slice(0, 1)}</span>
								</div>
							))}
						</div>
					</Card>

					<div className="grid gap-4 md:grid-cols-2">
						<Card eyebrow="Top languages">
							<Ranked items={view.languages} />
							{view.newLanguages.length ? (
								<p className="text-xs text-muted-foreground">
									New this year: {view.newLanguages.slice(0, 5).join(', ')}
								</p>
							) : null}
						</Card>
						<Card eyebrow="Top projects">
							<Ranked items={view.projects} />
						</Card>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Card eyebrow="Editors">
							<Ranked items={view.editors} />
						</Card>
						{view.aiLineChanges + view.humanLineChanges > 0 ? (
							<Card eyebrow="Lines changed">
								<p className="tabular text-3xl font-semibold">
									{(view.aiLineChanges + view.humanLineChanges).toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">
									{Math.round((view.aiLineChanges / (view.aiLineChanges + view.humanLineChanges)) * 100)}% with AI
									assistance
								</p>
							</Card>
						) : null}
					</div>
				</>
			)}
		</div>
	);
}
