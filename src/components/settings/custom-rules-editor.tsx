'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RuleFieldsList, RuleOperationsList, type RuleField } from '@/lib/util/CustomRules';

import type { CustomRuleResponse } from '@/server/custom-rule/custom-rule.response.dto';

interface DraftRule {
	key: string;
	action: 'change' | 'delete';
	source: RuleField;
	operation: (typeof RuleOperationsList)[number];
	sourceValue: string;
	destination: RuleField;
	destinationValue: string;
}

const FIELD_LABEL: Record<RuleField, string> = {
	project: 'project',
	entity: 'file path',
	language: 'language',
	branch: 'branch',
	category: 'category',
	editor: 'editor',
	operating_system: 'OS',
	machine: 'machine',
};

let nextKey = 0;
const blank = (): DraftRule => ({
	key: `new-${nextKey++}`,
	action: 'change',
	source: 'project',
	operation: 'equals',
	sourceValue: '',
	destination: 'project',
	destinationValue: '',
});

const fromResponse = (rule: CustomRuleResponse): DraftRule => ({
	key: rule.id,
	action: rule.action,
	source: rule.source,
	operation: rule.operation,
	sourceValue: rule.source_value,
	destination: (rule.destinations[0]?.destination as RuleField) ?? 'project',
	destinationValue: rule.destinations[0]?.destination_value ?? '',
});

function Choice<T extends string>({
	value,
	options,
	onChange,
	label,
	format = (option) => option,
}: {
	value: T;
	options: readonly T[];
	onChange: (value: T) => void;
	label: string;
	format?: (option: T) => string;
}) {
	return (
		<Select value={value} onValueChange={(next) => onChange(next as T)}>
			<SelectTrigger size="sm" className="h-8 w-auto min-w-24 text-xs" aria-label={label}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option} value={option} className="text-xs">
						{format(option)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** Rules read as sentences and run top to bottom; saving rewrites past activity in the background. */
export function CustomRulesEditor({ initialRules }: { initialRules: CustomRuleResponse[] }) {
	const router = useRouter();
	const [rules, setRules] = useState(() => initialRules.map(fromResponse));
	const [progress, setProgress] = useState<number | null>(null);
	const [errors, setErrors] = useState<Record<string, string[]>>({});

	const update = (key: string, patch: Partial<DraftRule>) =>
		setRules((current) => current.map((rule) => (rule.key === key ? { ...rule, ...patch } : rule)));
	const move = (index: number, by: -1 | 1) =>
		setRules((current) => {
			const next = [...current];
			[next[index], next[index + by]] = [next[index + by], next[index]];
			return next;
		});

	async function save() {
		setProgress(0);
		const response = await fetch('/api/v1/users/current/custom_rules', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(
				rules.map((rule, index) => ({
					action: rule.action,
					source: rule.source,
					operation: rule.operation,
					source_value: rule.sourceValue,
					priority: index + 1,
					...(rule.action === 'change'
						? { destination: rule.destination, destination_value: rule.destinationValue }
						: {}),
				})),
			),
		});
		const json = await response.json();
		if (!response.ok) {
			setProgress(null);
			setErrors(json.errors ?? {});
			toast.error(json.error ?? 'Could not save rules');
			return;
		}
		setErrors({});

		// Poll the background job that rewrites past heartbeats.
		for (;;) {
			const poll = await fetch(`/api/v1/users/current/custom_rules_progress?job_id=${json.data.job_id}`);
			const { data } = await poll.json();
			setProgress(data.progress);
			if (data.status === 'done') {
				toast.success(
					`Rules applied · ${data.changed_heartbeats.toLocaleString()} heartbeats changed, ${data.deleted_heartbeats.toLocaleString()} removed`,
				);
				break;
			}
			if (data.status === 'failed') {
				toast.error(`Applying rules failed: ${data.error ?? 'unknown error'}`);
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 600));
		}
		setProgress(null);
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-muted-foreground">
				Rename or merge projects, fix languages, or drop activity you never want counted. Rules run top to bottom on new
				heartbeats, and saving re-applies them to your whole history. “Equals” is exact; the other matches ignore case.
			</p>

			{rules.length ? (
				<ol className="flex flex-col gap-2">
					{rules.map((rule, index) => (
						<li
							key={rule.key}
							className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background/40 p-2 text-xs"
						>
							<span className="tabular w-5 text-center text-muted-foreground">{index + 1}</span>
							<span className="text-muted-foreground">If</span>
							<Choice
								label="Field to match"
								value={rule.source}
								options={RuleFieldsList}
								format={(f) => FIELD_LABEL[f]}
								onChange={(source) => update(rule.key, { source })}
							/>
							<Choice
								label="Match type"
								value={rule.operation}
								options={RuleOperationsList}
								onChange={(operation) => update(rule.key, { operation })}
							/>
							<Input
								value={rule.sourceValue}
								onChange={(event) => update(rule.key, { sourceValue: event.target.value })}
								placeholder="value"
								aria-label="Value to match"
								className="h-8 w-36 text-xs"
							/>
							<span className="text-muted-foreground">then</span>
							<Choice
								label="Action"
								value={rule.action}
								options={['change', 'delete'] as const}
								format={(action) => (action === 'change' ? 'change' : 'ignore it')}
								onChange={(action) => update(rule.key, { action })}
							/>
							{rule.action === 'change' ? (
								<>
									<Choice
										label="Field to change"
										value={rule.destination}
										options={RuleFieldsList}
										format={(f) => FIELD_LABEL[f]}
										onChange={(destination) => update(rule.key, { destination })}
									/>
									<span className="text-muted-foreground">to</span>
									<Input
										value={rule.destinationValue}
										onChange={(event) => update(rule.key, { destinationValue: event.target.value })}
										placeholder="new value"
										aria-label="New value"
										className="h-8 w-36 text-xs"
									/>
								</>
							) : null}
							<span className="ml-auto flex items-center">
								<Button
									size="icon"
									variant="ghost"
									className="size-7"
									disabled={index === 0}
									onClick={() => move(index, -1)}
									aria-label="Move up"
								>
									<ArrowUp />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									className="size-7"
									disabled={index === rules.length - 1}
									onClick={() => move(index, 1)}
									aria-label="Move down"
								>
									<ArrowDown />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									className="size-7"
									onClick={() => setRules((current) => current.filter((item) => item.key !== rule.key))}
									aria-label="Remove rule"
								>
									<Trash2 className="text-muted-foreground" />
								</Button>
							</span>
							{errors[String(index)] ? (
								<p className="w-full pl-6 text-destructive">{errors[String(index)][0]}</p>
							) : null}
						</li>
					))}
				</ol>
			) : (
				<p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
					No rules yet.
				</p>
			)}

			<div className="flex items-center gap-2">
				<Button size="sm" variant="outline" onClick={() => setRules((current) => [...current, blank()])}>
					<Plus /> Add rule
				</Button>
				<Button size="sm" onClick={save} disabled={progress !== null}>
					{progress === null ? 'Save & apply' : `Applying… ${progress}%`}
				</Button>
			</div>
			{progress !== null ? (
				<div className="h-1 overflow-hidden rounded-full bg-white/5">
					<div className="h-full bg-ember transition-[width]" style={{ width: `${progress}%` }} />
				</div>
			) : null}
		</div>
	);
}
