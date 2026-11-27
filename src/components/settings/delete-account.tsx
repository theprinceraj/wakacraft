'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { Field } from '@/components/app/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient, signOut } from '@/lib/auth/auth-client';

const DELETED = [
	'Your heartbeats, projects, daily summaries, goals, custom rules and imports',
	'Your API keys, machines and editor history',
	'Clients and invoices',
	'Leaderboards you own, and your place on others',
	'Teams where you are the only member, and your membership of the rest',
	'OAuth apps you created, and every app you authorized',
	'Your profile and sign-in',
];

/** Self-serve account deletion. `confirmText` (username, else email) must be typed before the button unlocks. */
export function DeleteAccount({ confirmText }: { confirmText: string }) {
	const router = useRouter();
	const [typed, setTyped] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [reauth, setReauth] = useState(false);

	function reset(open: boolean) {
		if (open) return;
		setTyped('');
		setError(null);
		setReauth(false);
	}

	async function remove() {
		setError(null);
		const { error: failure } = await authClient.deleteUser({});
		if (failure) {
			// Better Auth wants a session signed in within the last day.
			if (failure.code === 'SESSION_EXPIRED') {
				setReauth(true);
				setError('For your security, sign in again before deleting your account.');
				return false;
			}
			if (failure.status === 403 || failure.status === 409) {
				setError(failure.message ?? 'Your account cannot be deleted right now.');
				return false;
			}
			// Our data goes before the account itself, so a server error may leave it half deleted. Every step can
			// safely run again.
			if (failure.status >= 500) {
				setError('Deletion may have partly completed. Try again to finish it.');
				return false;
			}
			throw new Error(failure.message ?? 'Could not delete your account');
		}
		// The deletion already ended the session server-side; this clears the client's copy.
		await signOut().catch(() => undefined);
		toast.success('Your account and all its data have been deleted.');
		router.replace('/');
		router.refresh();
	}

	async function signInAgain() {
		await signOut();
		router.push('/login?next=/settings');
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="text-sm">
				<p>Deleting your account permanently removes, right away:</p>
				<ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
					{DELETED.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
				<p className="mt-3 text-muted-foreground">
					This can&apos;t be undone.{' '}
					<a href="#import-export" className="text-ember-text underline underline-offset-2">
						Export your data first
					</a>{' '}
					if you want to keep it. A team you own that others belong to passes to another owner; if it has none, delete
					the team or remove its other members first.
				</p>
			</div>
			<div>
				<ConfirmDialog
					trigger={
						<Button variant="danger">
							<Trash2 /> Delete account
						</Button>
					}
					onOpenChange={reset}
					title="Delete your account?"
					description="Your account and everything in it are deleted permanently. This can't be undone."
					action="Delete account"
					disabled={typed.trim() !== confirmText}
					onConfirm={remove}
				>
					<div className="flex flex-col gap-3">
						<Field label={`Type ${confirmText} to confirm`}>
							<Input
								value={typed}
								onChange={(event) => setTyped(event.target.value)}
								autoComplete="off"
								spellCheck={false}
								autoFocus
							/>
						</Field>
						{error ? (
							<div role="alert" className="flex flex-col items-start gap-2 text-[13px] text-destructive">
								<p>{error}</p>
								{reauth ? (
									<Button size="sm" variant="outline" onClick={signInAgain}>
										Sign in again
									</Button>
								) : null}
							</div>
						) : null}
					</div>
				</ConfirmDialog>
			</div>
		</div>
	);
}
