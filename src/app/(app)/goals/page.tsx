import { Plus, Target } from 'lucide-react';
import { Suspense } from 'react';

import { GoalCard } from '@/components/goals/goal-card';
import { GoalDialog } from '@/components/goals/goal-dialog';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { goalService } from '@/server/goal/goal.service';
import { projectService } from '@/server/project/project.service';
import { statsService } from '@/server/stats/stats.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Goals' };

export default function GoalsPage() {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Goals />
		</Suspense>
	);
}

async function Goals() {
	const session = await requireSession('/goals');
	const [goals, projects, stats] = await Promise.all([
		goalService.list(session.user.id),
		projectService.list(session.user.id),
		statsService.getStats(session.user.id, 'last_6_months', {}),
	]);
	const facets = {
		projects: projects.map((project) => project.name),
		languages: stats.data.languages.map((language) => language.name).filter((name) => name !== 'Other'),
		editors: stats.data.editors.map((editor) => editor.name),
	};

	const newGoal = (
		<GoalDialog
			facets={facets}
			trigger={
				<Button size="sm">
					<Plus /> New goal
				</Button>
			}
		/>
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-end justify-between gap-3">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Goals</h1>
					<p className="text-xs text-muted-foreground">Daily and weekly targets, checked against your real activity.</p>
				</div>
				{goals.length ? newGoal : null}
			</div>

			{goals.length ? (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{goals.map((goal) => (
						<GoalCard key={goal.id} goal={goal} facets={facets} />
					))}
				</div>
			) : (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/40 px-6 py-16 text-center">
					<Target className="size-6 text-ember" aria-hidden />
					<div>
						<p className="text-sm font-medium">Set your first goal</p>
						<p className="mt-1 text-xs text-muted-foreground">
							e.g. code at least 2 hours a day, or at most 40 hours a week.
						</p>
					</div>
					{newGoal}
				</div>
			)}
		</div>
	);
}
