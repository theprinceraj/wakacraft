'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SWATCHES = ['#f59e0b', '#fb923c', '#22d3ee', '#a78bfa', '#a3e635', '#f472b6', '#2dd4bf', '#94a3b8'];

export function ProjectSettings({
	projectId,
	color,
	repository,
}: {
	projectId: string;
	color: string | null;
	repository: string | null;
}) {
	const router = useRouter();
	const [values, setValues] = useState({ color, repository: repository ?? '' });
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const response = await fetch(`/api/v1/users/current/projects/${projectId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ color: values.color, repository: values.repository.trim() || null }),
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
		<form onSubmit={save} className="flex flex-col gap-4">
			<div className="grid gap-2">
				<Label className="text-xs">Color</Label>
				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						onClick={() => setValues({ ...values, color: null })}
						className="h-6 rounded border px-2 text-[11px] text-muted-foreground data-[on=true]:border-ember data-[on=true]:text-foreground"
						data-on={values.color === null}
					>
						Auto
					</button>
					{SWATCHES.map((swatch) => (
						<button
							key={swatch}
							type="button"
							aria-label={`Use ${swatch}`}
							onClick={() => setValues({ ...values, color: swatch })}
							className="size-6 rounded ring-offset-2 ring-offset-card data-[on=true]:ring-2 data-[on=true]:ring-foreground"
							data-on={values.color === swatch}
							style={{ background: swatch }}
						/>
					))}
				</div>
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="repository" className="text-xs">
					Repository URL
				</Label>
				<Input
					id="repository"
					value={values.repository}
					onChange={(event) => setValues({ ...values, repository: event.target.value })}
					placeholder="https://github.com/you/project"
					aria-invalid={Boolean(error)}
				/>
				{error ? <p className="text-xs text-destructive">{error}</p> : null}
			</div>
			<Button type="submit" size="sm" disabled={pending} className="self-start">
				{pending ? 'Saving…' : 'Save'}
			</Button>
		</form>
	);
}
