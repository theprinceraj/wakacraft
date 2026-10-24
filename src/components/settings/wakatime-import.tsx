'use client';

import { CloudDownload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { WakatimeImportResponse } from '@/server/wakatime-import/wakatime-import.service';

const ENDPOINT = '/api/v1/users/current/imports/wakatime';
const POLL_MS = 3000;

/**
 * Pulls history straight from wakatime.com with the user's personal WakaTime OAuth token. The import runs on the server; while this
 * page polls, each poll also keeps it moving, and the nightly cron finishes anything left unwatched.
 */
export function WakatimeImport({ initial }: { initial: WakatimeImportResponse | null }) {
	const router = useRouter();
	const [job, setJob] = useState(initial);
	const [token, setToken] = useState('');
	const [pending, setPending] = useState(false);
	const running = job?.status === 'running';

	useEffect(() => {
		if (!running) return;
		const timer = setInterval(async () => {
			const response = await fetch(ENDPOINT).catch(() => null);
			if (!response?.ok) return;
			const { data } = (await response.json()) as { data: WakatimeImportResponse | null };
			setJob(data);
			if (data?.status === 'done') {
				toast.success(`Imported ${data.heartbeats_imported.toLocaleString()} heartbeats from WakaTime`);
				router.refresh();
			}
		}, POLL_MS);
		return () => clearInterval(timer);
	}, [running, router]);

	async function start(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token }),
		});
		const json = await response.json().catch(() => ({}));
		setPending(false);
		if (!response.ok) {
			toast.error(json.error ?? 'Could not start the import');
			return;
		}
		setToken('');
		setJob(json.data);
	}

	async function cancel() {
		const response = await fetch(ENDPOINT, { method: 'DELETE' });
		const json = await response.json().catch(() => ({}));
		if (response.ok) setJob(json.data);
		else toast.error(json.error ?? 'Could not cancel');
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-sm font-medium">Import directly from wakatime.com</p>
			<p className="text-xs text-muted-foreground">
				Create a personal OAuth token at{' '}
				<a
					href="https://wakatime.com/oauth"
					target="_blank"
					rel="noreferrer"
					className="underline underline-offset-2 hover:text-foreground"
				>
					wakatime.com/oauth
				</a>{' '}
				and paste it here — WakaTime no longer accepts your secret API key outside editor plugins. wakacraft fetches
				your history one day at a time; the token is stored encrypted only while the import runs.
			</p>

			{running && job ? (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between text-xs">
						<span className="tabular text-muted-foreground">
							{job.waiting_until ? 'WakaTime asked us to slow down — resuming shortly · ' : ''}
							{job.days_done.toLocaleString()} / {job.days_total.toLocaleString()} days ·{' '}
							{job.heartbeats_imported.toLocaleString()} heartbeats
						</span>
						<Button size="sm" variant="ghost" className="h-7" onClick={cancel}>
							<X /> Cancel
						</Button>
					</div>
					<div className="h-1 overflow-hidden rounded-full bg-muted">
						<div className="h-full bg-ember transition-[width]" style={{ width: `${job.percent}%` }} />
					</div>
				</div>
			) : (
				<form onSubmit={start} className="mt-1 flex flex-col gap-2 sm:flex-row">
					<Input
						type="password"
						autoComplete="off"
						placeholder="Personal OAuth token"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						className="tabular sm:max-w-sm"
					/>
					<Button size="sm" type="submit" disabled={pending || token.trim().length < 20}>
						<CloudDownload /> {pending ? 'Checking token…' : 'Start import'}
					</Button>
				</form>
			)}

			{job && !running ? (
				<p className="text-xs text-muted-foreground">
					Last import:{' '}
					{job.status === 'done'
						? `finished, ${job.heartbeats_imported.toLocaleString()} heartbeats from ${job.start_date} to ${job.end_date}.`
						: job.status === 'cancelled'
							? `cancelled after ${job.days_done} of ${job.days_total} days.`
							: (job.error ?? 'failed.')}
				</p>
			) : null}
		</div>
	);
}
