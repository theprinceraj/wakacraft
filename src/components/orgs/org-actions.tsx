'use client';

import { LogOut, Pencil, Plus, RefreshCw, Trash2, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { OrgDashboardResponse } from '@/server/org/org.service';

const base = (orgId: string) => `/api/v1/users/current/orgs/${orgId}`;

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

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-1.5">
			<Label className="text-xs">{label}</Label>
			{children}
		</div>
	);
}

function Chips({
	options,
	selected,
	onChange,
	empty,
}: {
	options: { value: string; label: string }[];
	selected: string[];
	onChange: (next: string[]) => void;
	empty: string;
}) {
	if (!options.length) return <p className="text-xs text-muted-foreground">{empty}</p>;
	return (
		<div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
			{options.map((option) => {
				const on = selected.includes(option.value);
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={on}
						onClick={() => onChange(on ? selected.filter((v) => v !== option.value) : [...selected, option.value])}
						className={cn(
							'rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground',
							on && 'border-ember/60 bg-ember/15 text-ember',
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

export function CreateOrgButton() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');

	async function create(event: React.FormEvent) {
		event.preventDefault();
		try {
			const json = await send('/api/v1/users/current/orgs', 'POST', { name });
			setOpen(false);
			setName('');
			router.push(`/orgs/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<Plus /> New team
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>New team</DialogTitle>
				</DialogHeader>
				<form onSubmit={create} className="flex flex-col gap-4">
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Organization name"
						maxLength={80}
						autoFocus
					/>
					<p className="text-xs text-muted-foreground">
						You&apos;ll get an invite link. Everyone who joins shows up on the team&apos;s dashboards.
					</p>
					<DialogFooter>
						<Button type="submit" disabled={!name.trim()}>
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function JoinOrgButton({ code }: { code: string }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function join() {
		setPending(true);
		try {
			const json = await send('/api/v1/users/current/orgs/join', 'POST', { code });
			router.push(`/orgs/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
			setPending(false);
		}
	}

	return (
		<Button onClick={join} disabled={pending}>
			{pending ? 'Joining…' : 'Join team'}
		</Button>
	);
}

export function RenameOrgButton({ orgId, name }: { orgId: string; name: string }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(name);

	async function save(event: React.FormEvent) {
		event.preventDefault();
		try {
			await send(base(orgId), 'PATCH', { name: draft });
			setOpen(false);
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="icon" variant="ghost" className="size-7" aria-label="Rename team">
					<Pencil />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Rename team</DialogTitle>
				</DialogHeader>
				<form onSubmit={save} className="flex flex-col gap-4">
					<Input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={80} autoFocus />
					<DialogFooter>
						<Button type="submit" disabled={!draft.trim()}>
							Save
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function RegenerateInviteButton({ orgId }: { orgId: string }) {
	const router = useRouter();
	return (
		<Button
			size="sm"
			variant="ghost"
			onClick={async () => {
				try {
					await send(base(orgId), 'PATCH', { regenerate_invite: true });
					toast.success('New invite link created; the old one no longer works');
					router.refresh();
				} catch (error) {
					toast.error((error as Error).message);
				}
			}}
		>
			<RefreshCw /> New link
		</Button>
	);
}

export function LeaveOrgButton({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
	const router = useRouter();
	const [confirming, setConfirming] = useState(false);

	async function leave() {
		try {
			await send(base(orgId), 'DELETE');
			toast.success(isOwner ? 'Team deleted' : 'You left the team');
			router.push('/orgs');
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return confirming ? (
		<span className="flex items-center gap-2 text-xs">
			{isOwner ? 'Delete the team and its dashboards?' : 'Leave this team?'}
			<Button size="sm" variant="destructive" onClick={leave}>
				{isOwner ? 'Delete' : 'Leave'}
			</Button>
			<Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
				Cancel
			</Button>
		</span>
	) : (
		<Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
			{isOwner ? <Trash2 /> : <LogOut />} {isOwner ? 'Delete team' : 'Leave team'}
		</Button>
	);
}

/** Role switch and remove button for one member row; shown only when the viewer may change that member. */
export function MemberControls({ orgId, userId, role }: { orgId: string; userId: string; role: string }) {
	const router = useRouter();
	const [confirming, setConfirming] = useState(false);

	const run = async (method: string, body?: unknown) => {
		try {
			await send(`${base(orgId)}/members/${userId}`, method, body);
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	};

	return (
		<div className="flex items-center gap-1">
			<Select value={role} onValueChange={(next) => run('PATCH', { role: next })}>
				<SelectTrigger size="sm" className="h-7 w-24 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="admin">Admin</SelectItem>
					<SelectItem value="member">Member</SelectItem>
				</SelectContent>
			</Select>
			{confirming ? (
				<Button size="sm" variant="destructive" className="h-7" onClick={() => run('DELETE')}>
					Remove
				</Button>
			) : (
				<Button
					size="icon"
					variant="ghost"
					className="size-7"
					aria-label="Remove member"
					onClick={() => setConfirming(true)}
				>
					<UserMinus />
				</Button>
			)}
		</div>
	);
}

export function DashboardDialog({
	orgId,
	members,
	projects,
	dashboard,
	trigger,
}: {
	orgId: string;
	members: { id: string; label: string }[];
	projects: string[];
	dashboard?: OrgDashboardResponse;
	trigger: ReactNode;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState({
		name: dashboard?.name ?? '',
		memberIds: dashboard?.member_ids ?? [],
		projects: dashboard?.projects ?? [],
	});
	const [projectInput, setProjectInput] = useState('');

	const addProject = () => {
		const name = projectInput.trim();
		if (name && !draft.projects.includes(name)) setDraft({ ...draft, projects: [...draft.projects, name] });
		setProjectInput('');
	};

	async function save(event: React.FormEvent) {
		event.preventDefault();
		try {
			const body = { name: draft.name, member_ids: draft.memberIds, projects: draft.projects };
			const json = dashboard
				? await send(`${base(orgId)}/dashboards/${dashboard.id}`, 'PATCH', body)
				: await send(`${base(orgId)}/dashboards`, 'POST', body);
			setOpen(false);
			if (dashboard) router.refresh();
			else router.push(`/orgs/${orgId}/dashboards/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	async function remove() {
		try {
			await send(`${base(orgId)}/dashboards/${dashboard!.id}`, 'DELETE');
			setOpen(false);
			router.push(`/orgs/${orgId}`);
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{dashboard ? 'Edit dashboard' : 'New dashboard'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={save} className="flex flex-col gap-4">
					<Field label="Name">
						<Input
							value={draft.name}
							onChange={(e) => setDraft({ ...draft, name: e.target.value })}
							required
							maxLength={80}
						/>
					</Field>
					<Field label={`Members · ${draft.memberIds.length ? `${draft.memberIds.length} selected` : 'everyone'}`}>
						<Chips
							options={members.map((member) => ({ value: member.id, label: member.label }))}
							selected={draft.memberIds}
							onChange={(memberIds) => setDraft({ ...draft, memberIds })}
							empty="No members yet."
						/>
					</Field>
					<Field label={`Projects · ${draft.projects.length ? `${draft.projects.length} selected` : 'all projects'}`}>
						<Chips
							options={[...new Set([...draft.projects, ...projects])].map((name) => ({ value: name, label: name }))}
							selected={draft.projects}
							onChange={(next) => setDraft({ ...draft, projects: next })}
							empty="Type a project name below."
						/>
						<div className="flex gap-2">
							<Input
								value={projectInput}
								placeholder="Add a project by name"
								onChange={(e) => setProjectInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										addProject();
									}
								}}
							/>
							<Button type="button" variant="outline" onClick={addProject} disabled={!projectInput.trim()}>
								Add
							</Button>
						</div>
					</Field>
					<p className="text-xs text-muted-foreground">
						Leave members or projects empty to include everyone or every project.
					</p>
					<DialogFooter className="sm:justify-between">
						{dashboard ? (
							<Button type="button" variant="ghost" onClick={remove}>
								<Trash2 /> Delete
							</Button>
						) : (
							<span />
						)}
						<Button type="submit" disabled={!draft.name.trim()}>
							{dashboard ? 'Save' : 'Create dashboard'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
