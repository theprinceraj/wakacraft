'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Chip } from '@/components/app/chip';
import { Segmented } from '@/components/app/segmented';
import { SettingToggle } from '@/components/app/setting-toggle';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCategory } from '@/lib/format';
import { sendJson } from '@/lib/http/send-json';
import { Weekdays } from '@/lib/util/Goals';
import { CategoriesList } from '@/lib/util/Heartbeats';

import type { GoalResponse } from '@/server/goal/goal.response.dto';

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

/**
 * Create or edit a goal, written as a sentence. Filters are chips drawn from the user's own projects, languages and
 * editors. Opens from `trigger`, or through `open` when launched from a menu.
 */
export function GoalDialog({
	goal,
	facets,
	trigger,
	open: controlledOpen,
	onOpenChange,
}: {
	goal?: GoalResponse;
	facets: GoalFacets;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const router = useRouter();
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const setOpen = (next: boolean) => {
		setInternalOpen(next);
		onOpenChange?.(next);
	};
	const [draft, setDraft] = useState(() => fromGoal(goal));
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
	const toggle = (key: 'projects' | 'languages' | 'editors' | 'categories' | 'ignoreDays', value: string) =>
		set(key, draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value]);

	// Reopening starts from the saved goal, not from abandoned edits. Adjusted during render, so nothing flashes.
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setDraft(fromGoal(goal));
			setError(null);
		}
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (draft.hours * 3600 + draft.minutes * 60 <= 0) {
			setError('Enter a target above zero.');
			return;
		}
		setPending(true);
		try {
			await sendJson(
				goal ? `/api/v1/users/current/goals/${goal.id}` : '/api/v1/users/current/goals',
				goal ? 'PATCH' : 'POST',
				{
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
				},
			);
		} catch (failure) {
			setError((failure as Error).message);
			return;
		} finally {
			setPending(false);
		}
		setError(null);
		setOpen(false);
		toast.success(goal ? 'Goal updated' : 'Goal created');
		router.refresh();
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>{goal ? 'Edit goal' : 'New goal'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="flex flex-col gap-4.5">
					<div>
						<div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-4 text-[15px]">
							<span>Code</span>
							<Segmented
								aria-label="At least or at most"
								tone="background"
								value={draft.isInverse ? 'most' : 'least'}
								onValueChange={(value) => set('isInverse', value === 'most')}
								options={[
									{ value: 'least', label: 'at least' },
									{ value: 'most', label: 'at most' },
								]}
							/>
							<Input
								type="number"
								min={0}
								max={draft.delta === 'day' ? 24 : 168}
								value={draft.hours}
								onChange={(event) => {
									set('hours', Number(event.target.value));
									setError(null);
								}}
								className="h-10 w-16 text-center tabular-nums"
								aria-label="Hours"
								autoFocus
							/>
							<span>h</span>
							<Input
								type="number"
								min={0}
								max={59}
								step={5}
								value={draft.minutes}
								onChange={(event) => {
									set('minutes', Number(event.target.value));
									setError(null);
								}}
								className="h-10 w-16 text-center tabular-nums"
								aria-label="Minutes"
							/>
							<span>m per</span>
							<Segmented
								aria-label="Day or week"
								tone="background"
								value={draft.delta}
								onValueChange={(value) => set('delta', value as Draft['delta'])}
								options={[
									{ value: 'day', label: 'day' },
									{ value: 'week', label: 'week' },
								]}
							/>
						</div>
						{error ? <p className="mt-2 text-[12.5px] text-destructive">{error}</p> : null}
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
						format={formatCategory}
					/>
					{draft.delta === 'day' ? (
						<ChipGroup
							label="Ignore these days"
							values={[...Weekdays]}
							selected={draft.ignoreDays}
							onToggle={(v) => toggle('ignoreDays', v)}
							format={(day) => day.slice(0, 3)}
							emptyHint="none"
						/>
					) : null}

					<SettingToggle
						title="Skip days with no activity"
						hint="Holidays don't count as failures."
						checked={draft.ignoreZeroDays}
						onCheckedChange={(value) => set('ignoreZeroDays', value)}
						className="bg-card"
					/>

					<div className="grid gap-1.5">
						<Label htmlFor="goal-title" className="text-[13px]">
							Custom title <span className="font-normal text-muted-foreground">(optional)</span>
						</Label>
						<Input
							id="goal-title"
							value={draft.title}
							maxLength={120}
							placeholder="Leave empty for an automatic title"
							onChange={(event) => set('title', event.target.value)}
						/>
					</div>

					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="ghost">
								Cancel
							</Button>
						</DialogClose>
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
	emptyHint = 'any unless you pick some',
}: {
	label: string;
	values: readonly string[];
	selected: string[];
	onToggle: (value: string) => void;
	format?: (value: string) => string;
	emptyHint?: string;
}) {
	// Keep selections visible even if the value no longer appears in recent activity.
	const all = [...new Set([...selected, ...values])];
	if (!all.length) return null;

	return (
		<div className="grid gap-1.5">
			<span className="text-[13px] font-medium">
				{label}{' '}
				<span className="font-normal text-muted-foreground">
					· {selected.length ? `${selected.length} selected` : emptyHint}
				</span>
			</span>
			<div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto p-0.5">
				{all.map((value) => (
					<Chip key={value} selected={selected.includes(value)} onClick={() => onToggle(value)}>
						{format(value)}
					</Chip>
				))}
			</div>
		</div>
	);
}
