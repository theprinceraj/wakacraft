'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Weekdays } from '@/lib/util/Goals';
import { CategoriesList } from '@/lib/util/Heartbeats';
import { cn } from '@/lib/utils';

import type { GoalResponse } from '@/server/goal/goal.response.dto';

const SEGMENT = 'h-7 px-2 text-xs text-muted-foreground data-[state=on]:bg-ember/15 data-[state=on]:text-ember';

export interface GoalFacets {
	projects: string[];
	languages: string[];
	editors: string[];
}

interface Draft {
	title: string;
	delta: 'day' | 'week';
	hours: number;
	minutes: number;
	isInverse: boolean;
	projects: string[];
	languages: string[];
	editors: string[];
	categories: string[];
	ignoreDays: string[];
	ignoreZeroDays: boolean;
}

const fromGoal = (goal?: GoalResponse): Draft => ({
	title: goal?.custom_title ?? '',
	delta: goal?.delta ?? 'day',
	hours: goal ? Math.floor(goal.seconds / 3600) : 2,
	minutes: goal ? Math.floor((goal.seconds % 3600) / 60) : 0,
	isInverse: goal?.is_inverse ?? false,
	projects: goal?.projects ?? [],
	languages: goal?.languages ?? [],
	editors: goal?.editors ?? [],
	categories: goal?.categories ?? [],
	ignoreDays: goal?.ignore_days ?? [],
	ignoreZeroDays: goal?.ignore_zero_days ?? false,
});

/** Create or edit a goal. Filters are chips drawn from the user's own projects / languages / editors. */
export function GoalDialog({ goal, facets, trigger }: { goal?: GoalResponse; facets: GoalFacets; trigger: ReactNode }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(() => fromGoal(goal));
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
	const toggle = (key: 'projects' | 'languages' | 'editors' | 'categories' | 'ignoreDays', value: string) =>
		set(key, draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const response = await fetch(goal ? `/api/v1/users/current/goals/${goal.id}` : '/api/v1/users/current/goals', {
			method: goal ? 'PATCH' : 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				title: draft.title.trim() || null,
				delta: draft.delta,
				seconds: draft.hours * 3600 + draft.minutes * 60,
				isInverse: draft.isInverse,
				projects: draft.projects,
				languages: draft.languages,
				editors: draft.editors,
				categories: draft.categories,
				ignoreDays: draft.delta === 'day' ? draft.ignoreDays : [],
				ignoreZeroDays: draft.ignoreZeroDays,
			}),
		});
		setPending(false);
		const json = await response.json();
		if (!response.ok) {
			setError(json.error ?? 'Could not save the goal');
			return;
		}
		setError(null);
		setOpen(false);
		if (!goal) setDraft(fromGoal());
		toast.success(goal ? 'Goal updated' : 'Goal created');
		router.refresh();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setDraft(fromGoal(goal));
			}}
		>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{goal ? 'Edit goal' : 'New goal'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="flex flex-col gap-5">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<span>Code</span>
						<ToggleGroup
							type="single"
							value={draft.isInverse ? 'most' : 'least'}
							onValueChange={(value) => value && set('isInverse', value === 'most')}
							className="rounded-md border p-0.5"
						>
							<ToggleGroupItem value="least" className={SEGMENT}>
								at least
							</ToggleGroupItem>
							<ToggleGroupItem value="most" className={SEGMENT}>
								at most
							</ToggleGroupItem>
						</ToggleGroup>
						<Input
							type="number"
							min={0}
							max={draft.delta === 'day' ? 24 : 168}
							value={draft.hours}
							onChange={(event) => set('hours', Number(event.target.value))}
							className="tabular h-8 w-16"
							aria-label="Hours"
						/>
						<span>h</span>
						<Input
							type="number"
							min={0}
							max={59}
							step={5}
							value={draft.minutes}
							onChange={(event) => set('minutes', Number(event.target.value))}
							className="tabular h-8 w-16"
							aria-label="Minutes"
						/>
						<span>m per</span>
						<ToggleGroup
							type="single"
							value={draft.delta}
							onValueChange={(value) => value && set('delta', value as Draft['delta'])}
							className="rounded-md border p-0.5"
						>
							<ToggleGroupItem value="day" className={SEGMENT}>
								day
							</ToggleGroupItem>
							<ToggleGroupItem value="week" className={SEGMENT}>
								week
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					<ChipGroup
						label="Languages"
						values={facets.languages}
						selected={draft.languages}
						onToggle={(v) => toggle('languages', v)}
					/>
					<ChipGroup
						label="Projects"
						values={facets.projects}
						selected={draft.projects}
						onToggle={(v) => toggle('projects', v)}
					/>
					<ChipGroup
						label="Editors"
						values={facets.editors}
						selected={draft.editors}
						onToggle={(v) => toggle('editors', v)}
					/>
					<ChipGroup
						label="Categories"
						values={CategoriesList}
						selected={draft.categories}
						onToggle={(v) => toggle('categories', v)}
					/>
					{draft.delta === 'day' ? (
						<ChipGroup
							label="Ignore these days"
							values={[...Weekdays]}
							selected={draft.ignoreDays}
							onToggle={(v) => toggle('ignoreDays', v)}
							format={(day) => day.slice(0, 3)}
						/>
					) : null}

					<label className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
						<span>
							Skip days with no activity
							<span className="block text-xs text-muted-foreground">Holidays don&apos;t count as failures.</span>
						</span>
						<Switch checked={draft.ignoreZeroDays} onCheckedChange={(value) => set('ignoreZeroDays', value)} />
					</label>

					<div className="grid gap-1.5">
						<Label htmlFor="goal-title" className="text-xs">
							Custom title <span className="text-muted-foreground">(optional)</span>
						</Label>
						<Input
							id="goal-title"
							value={draft.title}
							maxLength={120}
							onChange={(event) => set('title', event.target.value)}
						/>
					</div>

					{error ? <p className="text-xs text-destructive">{error}</p> : null}
					<DialogFooter>
						<Button type="submit" disabled={pending}>
							{pending ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ChipGroup({
	label,
	values,
	selected,
	onToggle,
	format = (value) => value,
}: {
	label: string;
	values: readonly string[];
	selected: string[];
	onToggle: (value: string) => void;
	format?: (value: string) => string;
}) {
	// Keep selections visible even if the value no longer appears in recent activity.
	const all = [...new Set([...selected, ...values])];
	if (!all.length) return null;

	return (
		<div className="grid gap-1.5">
			<span className="text-xs">
				{label}{' '}
				<span className="text-muted-foreground">{selected.length ? `· ${selected.length} selected` : '· any'}</span>
			</span>
			<div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
				{all.map((value) => (
					<button
						key={value}
						type="button"
						onClick={() => onToggle(value)}
						aria-pressed={selected.includes(value)}
						className={cn(
							'rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground',
							selected.includes(value) && 'border-ember/60 bg-ember/15 text-ember hover:text-ember',
						)}
					>
						{format(value)}
					</button>
				))}
			</div>
		</div>
	);
}
