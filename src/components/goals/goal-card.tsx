'use client';

import { Flame, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import { GoalChart } from './goal-chart';
import { GoalDialog, type GoalFacets } from './goal-dialog';

import type { GoalResponse } from '@/server/goal/goal.response.dto';

const STATUS_LABEL: Record<GoalResponse['status'], { text: string; className: string }> = {
	success: { text: 'On track', className: 'bg-success/15 text-success' },
	fail: { text: 'Missed', className: 'bg-destructive/15 text-destructive' },
	pending: { text: 'In progress', className: 'bg-ember/15 text-ember' },
	ignored: { text: 'Paused', className: 'bg-muted text-muted-foreground' },
};

export function GoalCard({ goal, facets }: { goal: GoalResponse; facets: GoalFacets }) {
	const router = useRouter();
	const current = goal.chart_data.at(-1)!;
	const progress = Math.min(100, (current.actual_seconds / goal.seconds) * 100);
	const status = STATUS_LABEL[goal.status];

	async function remove() {
		const response = await fetch(`/api/v1/users/current/goals/${goal.id}`, { method: 'DELETE' });
		if (!response.ok) {
			toast.error('Could not delete the goal');
			return;
		}
		toast.success('Goal deleted');
		router.refresh();
	}

	return (
		<article className="flex flex-col gap-4 rounded-lg border bg-card/80 p-4">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-sm leading-snug font-medium">{goal.title}</h2>
					<div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
						<span className={cn('rounded-full px-2 py-0.5', status.className)}>{status.text}</span>
						{goal.streak ? (
							<span className="tabular inline-flex items-center gap-1 text-muted-foreground">
								<Flame className="size-3 text-ember" aria-hidden />
								{goal.streak} {goal.delta === 'day' ? 'day' : 'week'}
								{goal.streak === 1 ? '' : 's'}
							</span>
						) : null}
					</div>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="icon" variant="ghost" className="size-7 shrink-0" aria-label="Goal actions">
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<GoalDialog
							goal={goal}
							facets={facets}
							trigger={
								<DropdownMenuItem onSelect={(event) => event.preventDefault()}>
									<Pencil /> Edit
								</DropdownMenuItem>
							}
						/>
						<DropdownMenuItem variant="destructive" onSelect={remove}>
							<Trash2 /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			<div>
				<div className="mb-1.5 flex items-baseline justify-between text-xs">
					<span className="text-muted-foreground">{goal.delta === 'day' ? 'Today' : 'This week'}</span>
					<span className="tabular">
						<span className="text-foreground">{formatDuration(current.actual_seconds)}</span>
						<span className="text-muted-foreground"> / {formatDuration(goal.seconds)}</span>
					</span>
				</div>
				<div className="h-1.5 overflow-hidden rounded-full bg-white/5">
					<div
						className="h-full rounded-full"
						style={{
							width: `${progress}%`,
							background:
								goal.is_inverse && current.actual_seconds > goal.seconds ? 'var(--destructive)' : 'var(--ember)',
						}}
					/>
				</div>
			</div>

			<GoalChart goal={goal} />
			<p className="text-[11px] text-muted-foreground">
				Last {goal.chart_data.length} {goal.delta === 'day' ? 'days' : 'weeks'}
			</p>
		</article>
	);
}
