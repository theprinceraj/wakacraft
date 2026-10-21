'use client';

import { Check, Copy, KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ApiKeyResponse } from '@/server/api-key/api-key.response.dto';

const ENDPOINT = '/api/v1/users/current/api_keys';

/** Timestamps render in the viewer's local time, not the UTC calendar date. */
const localDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ApiKeys({ initialKeys }: { initialKeys: ApiKeyResponse[] }) {
	const [keys, setKeys] = useState(initialKeys);
	const [name, setName] = useState('');
	const [revealed, setRevealed] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [pending, setPending] = useState(false);

	async function create(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: name.trim() || 'Default' }),
		});
		setPending(false);
		const json = await response.json();
		if (!response.ok) {
			toast.error(json.error ?? 'Could not create the key');
			return;
		}
		const { key, ...apiKey } = json.data as ApiKeyResponse & { key: string };
		setKeys((current) => [apiKey, ...current]);
		setRevealed(key);
		setName('');
	}

	async function revoke(id: string) {
		const response = await fetch(`${ENDPOINT}/${id}`, { method: 'DELETE' });
		if (!response.ok) {
			toast.error('Could not revoke the key');
			return;
		}
		setKeys((current) => current.filter((key) => key.id !== id));
		toast.success('Key revoked. Plugins using it will stop syncing.');
	}

	return (
		<div className="flex flex-col gap-4">
			{revealed ? (
				<div className="rounded-md border border-ember/40 bg-ember/10 p-3">
					<p className="text-xs font-medium text-ember">Copy this key now — it won&apos;t be shown again.</p>
					<div className="mt-2 flex items-center gap-2">
						<code className="tabular flex-1 truncate rounded bg-background/70 px-2 py-1.5 text-xs">{revealed}</code>
						<Button
							size="sm"
							variant="outline"
							onClick={async () => {
								await navigator.clipboard.writeText(revealed);
								setCopied(true);
								setTimeout(() => setCopied(false), 1500);
							}}
						>
							{copied ? <Check className="text-success" /> : <Copy />} Copy
						</Button>
					</div>
				</div>
			) : null}

			<form onSubmit={create} className="flex gap-2">
				<Input
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="Key name, e.g. Work laptop"
					maxLength={100}
					className="max-w-xs"
				/>
				<Button type="submit" disabled={pending}>
					<KeyRound /> Create key
				</Button>
			</form>

			{keys.length ? (
				<ul className="divide-y rounded-md border">
					{keys.map((key) => (
						<li key={key.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
							<KeyRound className="size-3.5 text-muted-foreground" aria-hidden />
							<div className="min-w-0 flex-1">
								<p className="truncate">{key.name}</p>
								<p className="tabular text-[11px] text-muted-foreground">
									waka_…{key.keyPreview} · created {localDate.format(new Date(key.created_at))}
									{key.last_used_at ? ` · last used ${localDate.format(new Date(key.last_used_at))}` : ' · never used'}
								</p>
							</div>
							<Button size="icon" variant="ghost" aria-label={`Revoke ${key.name}`} onClick={() => revoke(key.id)}>
								<Trash2 className="text-muted-foreground" />
							</Button>
						</li>
					))}
				</ul>
			) : (
				<p className="text-xs text-muted-foreground">No API keys yet. Create one for each machine you code on.</p>
			)}
		</div>
	);
}
