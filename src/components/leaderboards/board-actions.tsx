'use client';

import { Check, Copy, LogOut, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function CreateBoardButton() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');

	async function create(event: React.FormEvent) {
		event.preventDefault();
		const response = await fetch('/api/v1/users/current/leaderboards', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name }),
		});
		const json = await response.json();
		if (!response.ok) {
			toast.error(json.error ?? 'Could not create the leaderboard');
			return;
		}
		setOpen(false);
		setName('');
		router.push(`/leaderboards/${json.data.id}`);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<Plus /> New leaderboard
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>New private leaderboard</DialogTitle>
				</DialogHeader>
				<form onSubmit={create} className="flex flex-col gap-4">
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Team name"
						maxLength={80}
						autoFocus
					/>
					<p className="text-xs text-muted-foreground">
						You&apos;ll get an invite link to share. Members see each other&apos;s last 7 days.
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

export function InviteLink({ url }: { url: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="flex items-center gap-2">
			<code className="tabular flex-1 truncate rounded-md border bg-background/60 px-2.5 py-1.5 text-xs">{url}</code>
			<Button
				size="sm"
				variant="outline"
				onClick={async () => {
					await navigator.clipboard.writeText(url);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				}}
			>
				{copied ? <Check className="text-success" /> : <Copy />} Copy invite
			</Button>
		</div>
	);
}

export function LeaveBoardButton({ boardId, isOwner }: { boardId: string; isOwner: boolean }) {
	const router = useRouter();
	const [confirming, setConfirming] = useState(false);

	async function leave() {
		const response = await fetch(`/api/v1/users/current/leaderboards/${boardId}`, { method: 'DELETE' });
		if (!response.ok) {
			toast.error('Something went wrong');
			return;
		}
		toast.success(isOwner ? 'Leaderboard deleted' : 'You left the leaderboard');
		router.push('/leaderboards');
		router.refresh();
	}

	return confirming ? (
		<span className="flex items-center gap-2 text-xs">
			{isOwner ? 'Delete for everyone?' : 'Leave this leaderboard?'}
			<Button size="sm" variant="destructive" onClick={leave}>
				{isOwner ? 'Delete' : 'Leave'}
			</Button>
			<Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
				Cancel
			</Button>
		</span>
	) : (
		<Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
			{isOwner ? <Trash2 /> : <LogOut />} {isOwner ? 'Delete' : 'Leave'}
		</Button>
	);
}

export function JoinBoardButton({ code }: { code: string }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function join() {
		setPending(true);
		const response = await fetch('/api/v1/users/current/leaderboards/join', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ code }),
		});
		setPending(false);
		const json = await response.json();
		if (!response.ok) {
			toast.error(json.error ?? 'Could not join');
			return;
		}
		router.push(`/leaderboards/${json.data.id}`);
	}

	return (
		<Button onClick={join} disabled={pending}>
			{pending ? 'Joining…' : 'Join leaderboard'}
		</Button>
	);
}
