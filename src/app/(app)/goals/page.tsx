import { Plus, Target } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { EmptyState, PageSkeleton } from '@/components/app/states';
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
		<Suspense fallback={<PageSkeleton stats={false} />}>
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
				<Button size="lg" className="pl-4">
					<Plus /> New goal
				</Button>
			}
		/>
	);

	return (
		<>
			<PageHeader
				title="Goals"
				description="Daily and weekly targets, checked against your real activity."
				actions={goals.length ? newGoal : undefined}
			/>
			{goals.length ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{goals.map((goal) => (
						<GoalCard key={goal.id} goal={goal} facets={facets} />
					))}
				</div>
			) : (
				<EmptyState icon={Target} title="Set your first goal" action={newGoal}>
					Code at least 2 hours a day, keep a language going every week, or cap yourself at 40 hours.
				</EmptyState>
			)}
		</>
	);
}
