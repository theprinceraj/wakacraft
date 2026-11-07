'use client';

import { CircleCheck, CircleX, Clock, Flame, MoreHorizontal, Pause, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Tag } from '@/components/app/chip';
import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDuration } from '@/lib/format';
import { sendJson } from '@/lib/http/send-json';

import { GoalChart } from './goal-chart';
import { GoalDialog, type GoalFacets } from './goal-dialog';

import type { GoalResponse } from '@/server/goal/goal.response.dto';

const STATUS = {
	success: { text: 'On track', tone: 'good', icon: CircleCheck },
	fail: { text: 'Missed', tone: 'bad', icon: CircleX },
	pending: { text: 'In progress', tone: 'ember', icon: Clock },
	ignored: { text: 'Paused', tone: 'neutral', icon: Pause },
} as const satisfies Record<GoalResponse['status'], object>;

export function GoalCard({ goal, facets }: { goal: GoalResponse; facets: GoalFacets }) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const current = goal.chart_data.at(-1)!;
	const progress = Math.min(100, (current.actual_seconds / goal.seconds) * 100);
	const status = STATUS[goal.status];
	const StatusIcon = status.icon;
	const over = goal.is_inverse && current.actual_seconds > goal.seconds;

	async function remove() {
		await sendJson(`/api/v1/users/current/goals/${goal.id}`, 'DELETE');
		toast.success('Goal deleted');
		router.refresh();
	}

	return (
		<article className="tile flex min-w-0 flex-col gap-4.5 p-5.5 sm:p-7">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-lg leading-snug font-semibold tracking-[-0.025em]">{goal.title}</h2>
					<div className="mt-2 flex flex-wrap items-center gap-2">
						<Tag tone={status.tone}>
							<StatusIcon aria-hidden /> {status.text}
						</Tag>
						{goal.streak ? (
							<span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
								<Flame className="size-3.5" aria-hidden />
								{goal.streak} {goal.delta === 'day' ? 'day' : 'week'}
								{goal.streak === 1 ? '' : 's'}
							</span>
						) : null}
					</div>
				</div>
				{/* Non-modal, so that the dialogs it opens can take focus and clean up after themselves. */}
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button size="icon" variant="ghost" className="-mt-1 -mr-1 text-muted-foreground" aria-label="Goal actions">
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="rounded-2xl p-1.5">
						<DropdownMenuItem onSelect={() => setEditing(true)}>
							<Pencil /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
							<Trash2 /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			<div>
				<div className="flex items-baseline justify-between text-[13px]">
					<span className="text-muted-foreground">{goal.delta === 'day' ? 'Today' : 'This week'}</span>
					<span className="tabular-nums">
						<span className="font-semibold">{formatDuration(current.actual_seconds)}</span>
						<span className="text-muted-foreground"> / {formatDuration(goal.seconds)}</span>
					</span>
				</div>
				<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
					<div
						className="h-full rounded-full transition-[width]"
						style={{ width: `${progress}%`, background: over ? 'var(--destructive)' : 'var(--primary)' }}
					/>
				</div>
			</div>

			<div className="mt-auto">
				<GoalChart goal={goal} />
				<p className="mt-2 text-xs text-muted-foreground">
					Last {goal.chart_data.length} {goal.delta === 'day' ? 'days' : 'weeks'} · line marks the target
				</p>
			</div>

			<GoalDialog goal={goal} facets={facets} open={editing} onOpenChange={setEditing} />
			<ConfirmDialog
				open={deleting}
				onOpenChange={setDeleting}
				title="Delete this goal?"
				description={`"${goal.title}" and its streak will be gone for good.`}
				action="Delete goal"
				onConfirm={remove}
			/>
		</article>
	);
}
