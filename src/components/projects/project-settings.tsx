'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { chipClass } from '@/components/app/chip';
import { SettingToggle } from '@/components/app/setting-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** The chart palette's light steps, so that a chosen colour stays legible on the charts it appears in. */
const SWATCHES = ['#d65f12', '#3558b0', '#0a9587', '#8a4fc7', '#c23b6b', '#8e7a12', '#64748b'];

export function ProjectSettings({
	projectId,
	color,
	repository,
	isPublic,
}: {
	projectId: string;
	color: string | null;
	repository: string | null;
	isPublic: boolean;
}) {
	const router = useRouter();
	const [values, setValues] = useState({ color, repository: repository ?? '', isPublic });
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	// A colour chosen before this palette existed stays selectable.
	const swatches = color && !SWATCHES.includes(color) ? [color, ...SWATCHES] : SWATCHES;

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const response = await fetch(`/api/v1/users/current/projects/${projectId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				color: values.color,
				repository: values.repository.trim() || null,
				hasPublicUrl: values.isPublic,
			}),
		});
		setPending(false);
		const json = await response.json();
		if (!response.ok) {
			setError(json.errors?.repository?.[0] ?? json.error ?? 'Could not save');
			return;
		}
		setError(null);
		toast.success('Project updated');
		router.refresh();
	}

	return (
		<form onSubmit={save} className="flex flex-col gap-6">
			<div className="grid gap-2.5">
				<span className="text-[13px] font-medium">Color</span>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						aria-pressed={values.color === null}
						onClick={() => setValues({ ...values, color: null })}
						className={chipClass(values.color === null)}
					>
						Auto
					</button>
					{swatches.map((swatch) => (
						<button
							key={swatch}
							type="button"
							aria-label={`Use ${swatch}`}
							aria-pressed={values.color === swatch}
							onClick={() => setValues({ ...values, color: swatch })}
							className={cn(
								'size-8 rounded-full ring-offset-2 ring-offset-card',
								values.color === swatch && 'ring-2 ring-foreground',
							)}
							style={{ background: swatch }}
						/>
					))}
				</div>
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="repository" className="text-[13px]">
					Repository URL
				</Label>
				<Input
					id="repository"
					value={values.repository}
					onChange={(event) => setValues({ ...values, repository: event.target.value })}
					placeholder="https://github.com/you/project"
					aria-invalid={Boolean(error)}
				/>
				{error ? (
					<p className="text-[12.5px] text-destructive">{error}</p>
				) : (
					<p className="text-[12.5px] text-muted-foreground">Adding a GitHub repository turns on the Commits tab.</p>
				)}
			</div>
			<SettingToggle
				title="Show on public profile"
				hint="Project names are private unless you list them here. Also gives you a README badge."
				checked={values.isPublic}
				onCheckedChange={(checked) => setValues({ ...values, isPublic: checked })}
			/>
			<Button type="submit" disabled={pending} className="self-start">
				{pending ? 'Saving…' : 'Save changes'}
			</Button>
		</form>
	);
}
