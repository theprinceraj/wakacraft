'use client';

import { LogOut, Pencil, Plus, RefreshCw, Trash2, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Chip } from '@/components/app/chip';
import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { Field } from '@/components/app/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { sendJson } from '@/lib/http/send-json';

import type { OrgDashboardResponse } from '@/server/org/org.service';

const base = (orgId: string) => `/api/v1/users/current/orgs/${orgId}`;

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
	if (!options.length) return <p className="text-[13px] text-muted-foreground">{empty}</p>;
	return (
		<div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto p-0.5">
			{options.map((option) => {
				const on = selected.includes(option.value);
				return (
					<Chip
						key={option.value}
						selected={on}
						onClick={() => onChange(on ? selected.filter((v) => v !== option.value) : [...selected, option.value])}
					>
						{option.label}
					</Chip>
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
			const json = await sendJson('/api/v1/users/current/orgs', 'POST', { name });
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
				<Button size="lg" className="pl-4">
					<Plus /> New team
				</Button>
			</DialogTrigger>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>New team</DialogTitle>
				</DialogHeader>
				<form onSubmit={create} className="flex flex-col gap-4">
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Organization name"
						aria-label="Organization name"
						maxLength={80}
						autoFocus
					/>
					<p className="text-[13px] text-muted-foreground">
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
			const json = await sendJson('/api/v1/users/current/orgs/join', 'POST', { code });
			router.push(`/orgs/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
			setPending(false);
		}
	}

	return (
		<Button size="lg" onClick={join} disabled={pending}>
			{pending ? 'Joining…' : 'Join the team'}
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
			await sendJson(base(orgId), 'PATCH', { name: draft });
			setOpen(false);
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="icon" variant="ghost" className="text-muted-foreground" aria-label="Rename team">
					<Pencil />
				</Button>
			</DialogTrigger>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>Rename team</DialogTitle>
				</DialogHeader>
				<form onSubmit={save} className="flex flex-col gap-4">
					<Input
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						aria-label="Team name"
						maxLength={80}
						autoFocus
					/>
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
		<ConfirmDialog
			title="Create a new invite link?"
			description="The current link stops working straight away."
			action="Create new link"
			onConfirm={async () => {
				await sendJson(base(orgId), 'PATCH', { regenerate_invite: true });
				toast.success('New invite link created; the old one no longer works');
				router.refresh();
			}}
			trigger={
				<Button
					size="sm"
					variant="ghost"
					className="text-ink-foreground hover:bg-ink-foreground/12 hover:text-ink-foreground"
				>
					<RefreshCw /> New link
				</Button>
			}
		/>
	);
}

export function LeaveOrgButton({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
	const router = useRouter();

	async function leave() {
		await sendJson(base(orgId), 'DELETE');
		toast.success(isOwner ? 'Team deleted' : 'You left the team');
		router.push('/orgs');
		router.refresh();
	}

	return (
		<ConfirmDialog
			title={isOwner ? 'Delete this team?' : 'Leave this team?'}
			description={
				isOwner
					? 'All its dashboards are deleted for everyone. Members keep their own coding time.'
					: "Your time stops showing on its dashboards. You'll need a new invite to come back."
			}
			action={isOwner ? 'Delete team' : 'Leave team'}
			onConfirm={leave}
			trigger={
				<Button variant="ghost" className="text-destructive hover:text-destructive">
					{isOwner ? <Trash2 /> : <LogOut />} {isOwner ? 'Delete team' : 'Leave team'}
				</Button>
			}
		/>
	);
}

/** Role switch and remove button for one member row; shown only when the viewer may change that member. */
export function MemberControls({
	orgId,
	userId,
	role,
	name,
}: {
	orgId: string;
	userId: string;
	role: string;
	name: string;
}) {
	const router = useRouter();

	const memberUrl = `${base(orgId)}/members/${userId}`;
	const changeRole = async (next: string) => {
		try {
			await sendJson(memberUrl, 'PATCH', { role: next });
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	};
	const remove = async () => {
		await sendJson(memberUrl, 'DELETE');
		router.refresh();
	};

	return (
		<div className="flex items-center gap-0.5">
			<Select value={role} onValueChange={changeRole}>
				<SelectTrigger size="sm" className="w-24 text-[13px]" aria-label={`Role for ${name}`}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="admin">Admin</SelectItem>
					<SelectItem value="member">Member</SelectItem>
				</SelectContent>
			</Select>
			<ConfirmDialog
				title={`Remove ${name}?`}
				description="They lose access to this team's dashboards, and their time no longer counts towards them."
				action="Remove"
				onConfirm={remove}
				trigger={
					<Button size="icon" variant="ghost" className="text-muted-foreground" aria-label={`Remove ${name}`}>
						<UserMinus />
					</Button>
				}
			/>
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
				? await sendJson(`${base(orgId)}/dashboards/${dashboard.id}`, 'PATCH', body)
				: await sendJson(`${base(orgId)}/dashboards`, 'POST', body);
			setOpen(false);
			if (dashboard) router.refresh();
			else router.push(`/orgs/${orgId}/dashboards/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	async function remove() {
		await sendJson(`${base(orgId)}/dashboards/${dashboard!.id}`, 'DELETE');
		setOpen(false);
		router.push(`/orgs/${orgId}`);
		router.refresh();
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" aria-describedby={undefined}>
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
					<Field
						group
						label={`Members · ${draft.memberIds.length ? `${draft.memberIds.length} selected` : 'everyone'}`}
					>
						<Chips
							options={members.map((member) => ({ value: member.id, label: member.label }))}
							selected={draft.memberIds}
							onChange={(memberIds) => setDraft({ ...draft, memberIds })}
							empty="No members yet."
						/>
					</Field>
					<Field
						group
						label={`Projects · ${draft.projects.length ? `${draft.projects.length} selected` : 'all projects'}`}
					>
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
					<p className="text-[13px] text-muted-foreground">
						Leave members or projects empty to include everyone or every project.
					</p>
					<DialogFooter className="sm:justify-between">
						{dashboard ? (
							<ConfirmDialog
								title="Delete this dashboard?"
								description="It goes away for everyone on the team. Their coding time isn't affected."
								action="Delete dashboard"
								onConfirm={remove}
								trigger={
									<Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
										<Trash2 /> Delete
									</Button>
								}
							/>
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
