'use client';

import { Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

const BATCH_SIZE = 500;

interface ExportFile {
	days?: { heartbeats?: unknown[] }[];
	user_agents?: unknown[];
	machines?: unknown[];
}

/**
 * Export streams straight from the server. Import parses the file in the browser and sends heartbeats in batches,
 * so exports of any size fit under the serverless request limit; re-importing the same file is harmless (dedup).
 */
export function ImportExport() {
	const router = useRouter();
	const input = useRef<HTMLInputElement>(null);
	const [exporting, setExporting] = useState<string | null>(null);
	const [importState, setImportState] = useState<{ done: number; total: number } | null>(null);

	async function startExport(type: 'heartbeats' | 'daily') {
		setExporting(type);
		const response = await fetch('/api/v1/users/current/data_dumps', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ type }),
		});
		setExporting(null);
		const json = await response.json();
		if (!response.ok) {
			toast.error(json.error ?? 'Could not start the export');
			return;
		}
		window.location.assign(json.data.download_url);
	}

	async function startImport(file: File) {
		let parsed: ExportFile;
		try {
			parsed = JSON.parse(await file.text());
		} catch {
			toast.error('That file is not valid JSON');
			return;
		}

		const heartbeats = (parsed.days ?? []).flatMap((day) => day.heartbeats ?? []);
		if (!heartbeats.length) {
			toast.error(
				parsed.days?.length
					? 'This looks like a daily summary export — export heartbeats instead to import them.'
					: 'No heartbeats found. Use a WakaTime or wakacraft heartbeats export.',
			);
			return;
		}

		let accepted = 0;
		let invalid = 0;
		setImportState({ done: 0, total: heartbeats.length });
		for (let index = 0; index < heartbeats.length; index += BATCH_SIZE) {
			const response = await fetch('/api/v1/users/current/imports/heartbeats', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					heartbeats: heartbeats.slice(index, index + BATCH_SIZE),
					user_agents: parsed.user_agents,
					machines: parsed.machines,
				}),
			});
			const json = await response.json();
			if (!response.ok) {
				toast.error(
					`Import stopped: ${json.error ?? response.statusText}. Re-run it to continue — nothing is duplicated.`,
				);
				setImportState(null);
				return;
			}
			accepted += json.data.accepted;
			invalid += json.data.invalid;
			setImportState({ done: Math.min(index + BATCH_SIZE, heartbeats.length), total: heartbeats.length });
		}

		setImportState(null);
		toast.success(
			`Imported ${accepted.toLocaleString()} heartbeats${invalid ? ` · ${invalid.toLocaleString()} skipped as invalid` : ''}`,
		);
		router.refresh();
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-background p-4">
				<p className="font-semibold">Export everything</p>
				<p className="flex-1 text-[13px] text-muted-foreground">
					Download everything as JSON in WakaTime&apos;s format. Links stay valid for 7 days.
				</p>
				<div className="mt-2.5 flex flex-wrap gap-2">
					<Button variant="outline" disabled={exporting !== null} onClick={() => startExport('heartbeats')}>
						<Download /> {exporting === 'heartbeats' ? 'Preparing…' : 'Heartbeats'}
					</Button>
					<Button variant="outline" disabled={exporting !== null} onClick={() => startExport('daily')}>
						<Download /> {exporting === 'daily' ? 'Preparing…' : 'Daily summaries'}
					</Button>
				</div>
			</div>

			<div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-background p-4">
				<p className="font-semibold">Upload an export file</p>
				<p className="flex-1 text-[13px] text-muted-foreground">
					In WakaTime, go to Settings, Account, Export and choose <em>heartbeats</em>, then upload the file here.
					wakacraft exports work too.
				</p>
				<input
					ref={input}
					type="file"
					accept="application/json,.json"
					className="hidden"
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = '';
						if (file) void startImport(file);
					}}
				/>
				<Button
					variant="outline"
					className="mt-2.5 self-start"
					disabled={importState !== null}
					onClick={() => input.current?.click()}
				>
					<Upload />
					{importState
						? `Importing… ${Math.round((importState.done / importState.total) * 100)}%`
						: 'Choose export file'}
				</Button>
				{importState ? (
					<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
						<div
							className="h-full rounded-full bg-primary transition-[width]"
							style={{ width: `${(importState.done / importState.total) * 100}%` }}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}
