'use client';

import { Check, Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { useCopy } from '@/components/app/use-copy';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { sendJson } from '@/lib/http/send-json';

import type { OAuthAppResponse } from '@/server/oauth/oauth.service';

const APPS = '/api/v1/users/current/oauth_apps';
const AUTHORIZATIONS = '/api/v1/users/current/oauth_authorizations';

const localDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function CopyValue({ value }: { value: string }) {
	const { copied, copy } = useCopy();
	return (
		<div className="flex items-center gap-2">
			<code className="min-w-0 flex-1 truncate rounded-lg bg-card px-2.5 py-1.5 font-mono text-xs">{value}</code>
			<Button size="icon-sm" variant="ghost" aria-label="Copy" onClick={() => copy(value)}>
				{copied ? <Check /> : <Copy />}
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
		await sendJson(`${AUTHORIZATIONS}/${appId}`, 'DELETE');
		setAuthorizations((current) => current.filter((item) => item.app_id !== appId));
		toast.success('Access revoked');
	}

	if (!authorizations.length) {
		return <p className="text-[13px] text-muted-foreground">No apps have access to your account.</p>;
	}
	return (
		<ul className="flex flex-col divide-y rounded-2xl bg-background">
			{authorizations.map((item) => (
				<li key={item.app_id} className="flex items-center gap-3 py-3 pr-2.5 pl-4">
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium">{item.name}</p>
						<p className="truncate text-xs text-muted-foreground">
							{item.scopes.join(', ') || 'public profile'} · authorized {localDate.format(new Date(item.authorized_at))}
							{item.last_used_at ? ` · last used ${localDate.format(new Date(item.last_used_at))}` : ''}
						</p>
					</div>
					<ConfirmDialog
						title={`Revoke ${item.name}?`}
						description="It loses access to your data immediately."
						action="Revoke"
						onConfirm={() => revoke(item.app_id)}
						trigger={
							<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
								Revoke
							</Button>
						}
					/>
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
			const json = await sendJson(APPS, 'POST', {
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
		const json = await sendJson(`${APPS}/${appId}/secret`, 'POST');
		setSecret({ appId, value: json.data.client_secret });
	}

	async function remove(appId: string) {
		await sendJson(`${APPS}/${appId}`, 'DELETE');
		toast.success('App deleted; its tokens no longer work');
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="max-w-[64ch] text-[13px] text-muted-foreground">
				Build on wakacraft with WakaTime-compatible OAuth 2: send users to{' '}
				<code className="font-mono text-xs break-all">{baseUrl}/oauth/authorize</code> and exchange codes at{' '}
				<code className="font-mono text-xs break-all">{baseUrl}/oauth/token</code>. PKCE is supported for apps without a
				server.
			</p>

			{initial.map((app) => (
				<div key={app.id} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-background p-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="min-w-0 truncate font-medium">{app.name}</p>
						<div className="flex gap-1">
							<ConfirmDialog
								title={`Create a new secret for ${app.name}?`}
								description="The current secret stops working straight away, so anything using it needs updating."
								action="Create new secret"
								onConfirm={() => rotate(app.id)}
								trigger={
									<Button size="sm" variant="ghost">
										<RefreshCw /> New secret
									</Button>
								}
							/>
							<ConfirmDialog
								title={`Delete ${app.name}?`}
								description="Its tokens stop working straight away. This cannot be undone."
								action="Delete app"
								onConfirm={() => remove(app.id)}
								trigger={
									<Button
										size="icon-sm"
										variant="ghost"
										className="text-muted-foreground"
										aria-label={`Delete ${app.name}`}
									>
										<Trash2 />
									</Button>
								}
							/>
						</div>
					</div>
					<div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
						<span>Client ID</span>
						<CopyValue value={app.client_id} />
						{secret?.appId === app.id ? (
							<div className="mt-1 rounded-xl bg-ember/11 p-3">
								<p className="mb-1.5 font-medium text-ember-text">
									Client secret. Copy it now; it won&apos;t be shown again.
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
					<Button variant="outline" className="self-start">
						<Plus /> Register an app
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-md" aria-describedby={undefined}>
					<DialogHeader>
						<DialogTitle>Register an OAuth app</DialogTitle>
					</DialogHeader>
					<form onSubmit={create} className="flex flex-col gap-4">
						<div className="grid gap-1.5">
							<Label className="text-[13px]">Name (shown on the consent screen)</Label>
							<Input
								value={draft.name}
								onChange={(e) => setDraft({ ...draft, name: e.target.value })}
								maxLength={80}
								required
							/>
						</div>
						<div className="grid gap-1.5">
							<Label className="text-[13px]">Website (optional)</Label>
							<Input
								type="url"
								value={draft.website}
								onChange={(e) => setDraft({ ...draft, website: e.target.value })}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label className="text-[13px]">Redirect URIs, one per line</Label>
							<textarea
								rows={3}
								required
								placeholder="https://example.com/oauth/callback"
								value={draft.redirectUris}
								onChange={(e) => setDraft({ ...draft, redirectUris: e.target.value })}
								className="rounded-xl border border-input bg-background px-3.5 py-2.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
