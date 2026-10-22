'use client';

import { AppWindow, Check, Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { OAuthAppResponse } from '@/server/oauth/oauth.service';

const APPS = '/api/v1/users/current/oauth_apps';
const AUTHORIZATIONS = '/api/v1/users/current/oauth_authorizations';

const localDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

async function send(url: string, method: string, body?: unknown) {
	const response = await fetch(url, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const json = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(json.error ?? 'Request failed');
	return json;
}

function CopyValue({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="flex items-center gap-2">
			<code className="tabular flex-1 truncate rounded bg-background/70 px-2 py-1.5 text-xs">{value}</code>
			<Button
				size="icon"
				variant="ghost"
				className="size-7"
				aria-label="Copy"
				onClick={async () => {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				}}
			>
				{copied ? <Check className="text-success" /> : <Copy />}
			</Button>
		</div>
	);
}

export interface Authorization {
	app_id: string;
	name: string;
	website: string | null;
	scopes: string[];
	authorized_at: string;
	last_used_at: string | null;
}

/** Apps you let into your account. */
export function AuthorizedApps({ initial }: { initial: Authorization[] }) {
	const [authorizations, setAuthorizations] = useState(initial);

	async function revoke(appId: string) {
		try {
			await send(`${AUTHORIZATIONS}/${appId}`, 'DELETE');
			setAuthorizations((current) => current.filter((item) => item.app_id !== appId));
			toast.success('Access revoked');
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	if (!authorizations.length) {
		return <p className="text-xs text-muted-foreground">No apps have access to your account.</p>;
	}
	return (
		<ul className="flex flex-col divide-y rounded-md border">
			{authorizations.map((item) => (
				<li key={item.app_id} className="flex items-center gap-3 px-3 py-2.5">
					<AppWindow className="size-4 shrink-0 text-muted-foreground" aria-hidden />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm">{item.name}</p>
						<p className="truncate text-[11px] text-muted-foreground">
							{item.scopes.join(', ') || 'public profile'} · authorized {localDate.format(new Date(item.authorized_at))}
							{item.last_used_at ? ` · last used ${localDate.format(new Date(item.last_used_at))}` : ''}
						</p>
					</div>
					<Button size="sm" variant="ghost" onClick={() => revoke(item.app_id)}>
						Revoke
					</Button>
				</li>
			))}
		</ul>
	);
}

/** Apps you registered as a developer, with their client credentials. */
export function DeveloperApps({ initial, baseUrl }: { initial: OAuthAppResponse[]; baseUrl: string }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState({ name: '', website: '', redirectUris: '' });
	const [secret, setSecret] = useState<{ appId: string; value: string } | null>(null);

	async function create(event: React.FormEvent) {
		event.preventDefault();
		try {
			const json = await send(APPS, 'POST', {
				name: draft.name,
				website: draft.website.trim() || null,
				redirect_uris: draft.redirectUris.split(/\s+/).filter(Boolean),
			});
			setOpen(false);
			setDraft({ name: '', website: '', redirectUris: '' });
			setSecret({ appId: json.data.id, value: json.data.client_secret });
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	async function rotate(appId: string) {
		try {
			const json = await send(`${APPS}/${appId}/secret`, 'POST');
			setSecret({ appId, value: json.data.client_secret });
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	async function remove(appId: string) {
		try {
			await send(`${APPS}/${appId}`, 'DELETE');
			toast.success('App deleted; its tokens no longer work');
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-muted-foreground">
				Build on wakacraft with WakaTime-compatible OAuth 2: send users to{' '}
				<code className="tabular">{baseUrl}/oauth/authorize</code> and exchange codes at{' '}
				<code className="tabular">{baseUrl}/oauth/token</code>. PKCE is supported for apps without a server.
			</p>

			{initial.map((app) => (
				<div key={app.id} className="flex flex-col gap-2 rounded-md border p-3">
					<div className="flex items-center justify-between gap-2">
						<p className="truncate text-sm font-medium">{app.name}</p>
						<div className="flex gap-1">
							<Button size="sm" variant="ghost" onClick={() => rotate(app.id)}>
								<RefreshCw /> New secret
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="size-8"
								aria-label="Delete app"
								onClick={() => remove(app.id)}
							>
								<Trash2 />
							</Button>
						</div>
					</div>
					<div className="grid gap-1 text-[11px] text-muted-foreground">
						<span>Client ID</span>
						<CopyValue value={app.client_id} />
						{secret?.appId === app.id ? (
							<div className="mt-1 rounded-md border border-ember/40 bg-ember/10 p-2">
								<p className="mb-1 font-medium text-ember">
									Client secret — copy it now, it won&apos;t be shown again.
								</p>
								<CopyValue value={secret.value} />
							</div>
						) : null}
						<span className="mt-1">Redirect URIs: {app.redirect_uris.join(', ')}</span>
					</div>
				</div>
			))}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button size="sm" variant="outline" className="self-start">
						<Plus /> Register an app
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Register an OAuth app</DialogTitle>
					</DialogHeader>
					<form onSubmit={create} className="flex flex-col gap-4">
						<div className="grid gap-1.5">
							<Label className="text-xs">Name (shown on the consent screen)</Label>
							<Input
								value={draft.name}
								onChange={(e) => setDraft({ ...draft, name: e.target.value })}
								maxLength={80}
								required
							/>
						</div>
						<div className="grid gap-1.5">
							<Label className="text-xs">Website (optional)</Label>
							<Input
								type="url"
								value={draft.website}
								onChange={(e) => setDraft({ ...draft, website: e.target.value })}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label className="text-xs">Redirect URIs, one per line</Label>
							<textarea
								rows={3}
								required
								placeholder="https://example.com/oauth/callback"
								value={draft.redirectUris}
								onChange={(e) => setDraft({ ...draft, redirectUris: e.target.value })}
								className="tabular rounded-md border bg-transparent px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={!draft.name.trim() || !draft.redirectUris.trim()}>
								Register
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
