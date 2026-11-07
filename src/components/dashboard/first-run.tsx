'use client';

import { Check, Copy, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EditorConfigs, ExtensionButtons } from '@/components/app/editor-setup';
import { useCopy } from '@/components/app/use-copy';
import { Button } from '@/components/ui/button';
import { sendJson } from '@/lib/http/send-json';

import { Panel } from './panel';

const REFRESH_MS = 15_000;
const STEP = 'tile flex min-w-0 flex-col gap-10 p-5.5 sm:p-7';
const NUMBER = 'font-mono text-[13px] text-muted-foreground';

/**
 * Setup for an account with no activity yet. The key is created here and flows straight into the config snippets,
 * and the page re-checks for a first heartbeat so that the dashboard appears by itself.
 */
export function FirstRun({ apiUrl }: { apiUrl: string }) {
	const router = useRouter();
	const [apiKey, setApiKey] = useState<string>();
	const [pending, setPending] = useState(false);
	const { copied, copy } = useCopy();

	useEffect(() => {
		const timer = setInterval(() => {
			if (!document.hidden) router.refresh();
		}, REFRESH_MS);
		return () => clearInterval(timer);
	}, [router]);

	async function createKey() {
		setPending(true);
		try {
			const json = await sendJson('/api/v1/users/current/api_keys', 'POST', { name: 'Default' });
			setApiKey(json.data.key);
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<ol className="grid gap-4 md:grid-cols-3">
				<li className={STEP}>
					<p className={NUMBER}>01</p>
					<div className="min-w-0">
						<h2 className="text-lg font-semibold tracking-[-0.025em]">Create your API key</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">Each editor or machine can have its own.</p>
						{apiKey ? (
							<>
								<div className="mt-4 flex items-center gap-1.5 rounded-full bg-background py-1 pr-1 pl-4">
									<code className="min-w-0 flex-1 truncate font-mono text-xs">{apiKey}</code>
									<Button size="icon-sm" variant="ghost" aria-label="Copy key" onClick={() => copy(apiKey)}>
										{copied ? <Check /> : <Copy />}
									</Button>
								</div>
								<p className="mt-2 text-xs text-muted-foreground">Copy it now. It won&apos;t be shown again.</p>
							</>
						) : (
							<Button className="mt-4" onClick={createKey} disabled={pending}>
								<KeyRound /> {pending ? 'Creating…' : 'Create key'}
							</Button>
						)}
					</div>
				</li>
				<li className={STEP}>
					<p className={NUMBER}>02</p>
					<div className="min-w-0">
						<h2 className="text-lg font-semibold tracking-[-0.025em]">Install the extension</h2>
						<p className="mt-1 mb-4 text-[13px] text-muted-foreground">
							wakacraft&apos;s own extensions ask for the key once, then stay out of your way. VS Code&apos;s also works
							in Cursor, Windsurf and VSCodium.
						</p>
						<ExtensionButtons />
					</div>
				</li>
				<li className={`${STEP} tile-ink`}>
					<p className={NUMBER}>03</p>
					<div className="min-w-0">
						<h2 className="text-lg font-semibold tracking-[-0.025em]">Write some code</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">
							Heartbeats arrive within about two minutes. This page fills in by itself.
						</p>
						<p className="mt-4 flex items-center gap-3 text-[13px]" role="status">
							<span className="size-2.25 shrink-0 animate-pulse rounded-full bg-on-ink-ember motion-reduce:animate-none" />
							Waiting for your first heartbeat
						</p>
					</div>
				</li>
			</ol>
			<Panel label="Zed, and every other editor">
				<EditorConfigs apiUrl={apiUrl} apiKey={apiKey} />
				<p className="mt-4 text-[13px] text-muted-foreground">
					Bringing your history?{' '}
					<Link href="/settings#import-export" className="font-medium text-ember-text underline underline-offset-3">
						Import from WakaTime
					</Link>
				</p>
			</Panel>
		</div>
	);
}
