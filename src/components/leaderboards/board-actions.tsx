'use client';

import { Check, Copy, LogOut, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { useCopy } from '@/components/app/use-copy';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { sendJson } from '@/lib/http/send-json';

export function CreateBoardButton() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');

	async function create(event: React.FormEvent) {
		event.preventDefault();
		try {
			const json = await sendJson('/api/v1/users/current/leaderboards', 'POST', { name });
			setOpen(false);
			setName('');
			router.push(`/leaderboards/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					<Plus /> New board
				</Button>
			</DialogTrigger>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>New private board</DialogTitle>
				</DialogHeader>
				<form onSubmit={create} className="flex flex-col gap-4">
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Team name"
						aria-label="Board name"
						maxLength={80}
						autoFocus
					/>
					<p className="text-[13px] text-muted-foreground">
						You&apos;ll get an invite link to share. Members see each other&apos;s last 7 days.
					</p>
					<DialogFooter>
						<Button type="submit" disabled={!name.trim()}>
							Create board
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/** The invite link in a pill, readable and one click to copy. Sits on any card, including the navy one. */
export function InviteLink({ url }: { url: string }) {
	const { copied, copy } = useCopy();
	return (
		<div className="flex min-w-0 items-center gap-2 rounded-full bg-background py-1.5 pr-1.5 pl-4 text-foreground">
			<code className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{url.replace(/^https?:\/\//, '')}</code>
			<Button size="sm" aria-label="Copy invite link" onClick={() => copy(url)}>
				{copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
			</Button>
		</div>
	);
}

export function LeaveBoardButton({ boardId, isOwner }: { boardId: string; isOwner: boolean }) {
	const router = useRouter();

	async function leave() {
		await sendJson(`/api/v1/users/current/leaderboards/${boardId}`, 'DELETE');
		toast.success(isOwner ? 'Leaderboard deleted' : 'You left the leaderboard');
		router.push('/leaderboards');
		router.refresh();
	}

	return (
		<ConfirmDialog
			title={isOwner ? 'Delete this board?' : 'Leave this board?'}
			description={
				isOwner
					? 'It goes away for every member. This cannot be undone.'
					: "Your time stops showing here. You'll need a new invite to come back."
			}
			action={isOwner ? 'Delete board' : 'Leave board'}
			onConfirm={leave}
			trigger={
				<Button variant="ghost" className="text-destructive hover:text-destructive">
					{isOwner ? <Trash2 /> : <LogOut />} {isOwner ? 'Delete board' : 'Leave board'}
				</Button>
			}
		/>
	);
}

export function JoinBoardButton({ code }: { code: string }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function join() {
		setPending(true);
		try {
			const json = await sendJson('/api/v1/users/current/leaderboards/join', 'POST', { code });
			router.push(`/leaderboards/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
			setPending(false);
		}
	}

	return (
		<Button size="lg" onClick={join} disabled={pending}>
			{pending ? 'Joining…' : 'Join the board'}
		</Button>
	);
}
