'use client';

import { Check, Copy, KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { useCopy } from '@/components/app/use-copy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendJson } from '@/lib/http/send-json';
import type { ApiKeyResponse } from '@/server/api-key/api-key.response.dto';

const ENDPOINT = '/api/v1/users/current/api_keys';

/** Timestamps render in the viewer's local time, not the UTC calendar date. */
const localDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ApiKeys({ initialKeys }: { initialKeys: ApiKeyResponse[] }) {
	const [keys, setKeys] = useState(initialKeys);
	const [name, setName] = useState('');
	const [revealed, setRevealed] = useState<string | null>(null);
	const { copied, copy } = useCopy();
	const [pending, setPending] = useState(false);

	async function create(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		try {
			const json = await sendJson(ENDPOINT, 'POST', { name: name.trim() || 'Default' });
			const { key, ...apiKey } = json.data as ApiKeyResponse & { key: string };
			setKeys((current) => [apiKey, ...current]);
			setRevealed(key);
			setName('');
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setPending(false);
		}
	}

	async function revoke(id: string) {
		await sendJson(`${ENDPOINT}/${id}`, 'DELETE');
		setKeys((current) => current.filter((key) => key.id !== id));
		toast.success('Key revoked. Plugins using it will stop syncing.');
	}

	return (
		<div className="flex flex-col gap-4">
			{revealed ? (
				<div className="rounded-2xl bg-ember/11 p-4">
					<p className="text-[13px] font-medium text-ember-text">Copy this key now. It won&apos;t be shown again.</p>
					<div className="mt-2 flex items-center gap-2">
						<code className="min-w-0 flex-1 truncate rounded-full bg-background px-4 py-2 font-mono text-xs">
							{revealed}
						</code>
						<Button size="sm" variant="outline" onClick={() => copy(revealed)}>
							{copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
						</Button>
					</div>
				</div>
			) : null}

			<form onSubmit={create} className="flex flex-wrap gap-2">
				<Input
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="Key name, e.g. Work laptop"
					aria-label="Key name"
					maxLength={100}
					className="max-w-sm flex-1 basis-56"
				/>
				<Button type="submit" size="lg" className="pl-4" disabled={pending}>
					<KeyRound /> Create key
				</Button>
			</form>

			{keys.length ? (
				<ul className="divide-y rounded-2xl bg-background">
					{keys.map((key) => (
						<li key={key.id} className="flex items-center gap-3 py-3 pr-2 pl-4 text-sm">
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium">{key.name}</p>
								<p className="truncate font-mono text-xs text-muted-foreground">
									waka_…{key.keyPreview} · created {localDate.format(new Date(key.created_at))}
									{key.last_used_at ? ` · last used ${localDate.format(new Date(key.last_used_at))}` : ' · never used'}
								</p>
							</div>
							<ConfirmDialog
								title={`Revoke "${key.name}"?`}
								description="Editors using this key stop syncing straight away."
								action="Revoke key"
								onConfirm={() => revoke(key.id)}
								trigger={
									<Button
										size="icon"
										variant="ghost"
										className="text-muted-foreground"
										aria-label={`Revoke ${key.name}`}
									>
										<Trash2 />
									</Button>
								}
							/>
						</li>
					))}
				</ul>
			) : (
				<p className="text-[13px] text-muted-foreground">No API keys yet. Create one for each machine you code on.</p>
			)}
		</div>
	);
}
