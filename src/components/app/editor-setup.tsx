'use client';

import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

const VSCODE_EXTENSION_URL = 'https://marketplace.visualstudio.com/items?itemName=wakacraft.wakacraft';
/** Not in Zed's extension registry yet; installed as a dev extension from the repository. */
const ZED_EXTENSION_URL = 'https://github.com/theprinceraj/wakacraft/tree/main/extensions/zed';

/**
 * The one-time editor setup. VS Code (and its forks) and Zed get wakacraft's own extensions, which keep their
 * config in `~/.wakacraft` so other plugins can't redirect them. Every other editor uses its WakaTime plugin
 * pointed at wakacraft through `~/.wakatime.cfg`.
 */
export function EditorSetup({ apiUrl, apiKey }: { apiUrl: string; apiKey?: string }) {
	const key = apiKey ?? 'waka_…';
	const config = `[settings]\napi_url = ${apiUrl}\napi_key = ${apiKey ?? 'waka_…  # create one in Settings → API keys'}`;
	const zedSettings = JSON.stringify(
		{
			lsp: {
				wakacraft: {
					settings: { 'api-key': key, ...(isDefaultServer(apiUrl) ? {} : { 'api-url': apiUrl }) },
				},
			},
		},
		null,
		2,
	);

	return (
		<ol className="flex flex-col gap-4 text-sm">
			<Step n="01" title="Create an API key">
				<p className="mt-1 text-xs text-muted-foreground">
					Under <span className="font-medium text-foreground">API keys</span> in Settings. Each editor or machine can
					have its own.
				</p>
			</Step>
			<Step n="02" title="Install the wakacraft extension">
				<ul className="mt-1 space-y-2 text-xs text-muted-foreground">
					<li>
						<a className="font-medium text-foreground underline underline-offset-2" href={VSCODE_EXTENSION_URL}>
							VS Code
						</a>{' '}
						(also Cursor, Windsurf and VSCodium): paste the key when it asks, or run{' '}
						<code className="tabular">wakacraft: API Key</code> from the command palette.
					</li>
					<li>
						<a className="font-medium text-foreground underline underline-offset-2" href={ZED_EXTENSION_URL}>
							Zed
						</a>
						: add the key to your <code className="tabular">settings.json</code>.
						<CopyBlock text={zedSettings} label="Copy Zed settings" />
					</li>
				</ul>
			</Step>
			<Step n="03" title="Another editor? Use its WakaTime plugin">
				<p className="mt-1 text-xs text-muted-foreground">
					JetBrains, Neovim, Sublime, Xcode and 100+ more work too: wakacraft speaks the WakaTime API. Install the
					editor&apos;s WakaTime plugin and point it at wakacraft in <code className="tabular">~/.wakatime.cfg</code> (
					<code className="tabular">%USERPROFILE%\.wakatime.cfg</code> on Windows):
				</p>
				<CopyBlock text={config} label="Copy configuration" />
				<p className="mt-2 text-xs text-muted-foreground">
					Every WakaTime plugin shares this file, so if one of them rewrites it, your time goes back to WakaTime. The
					wakacraft extensions don&apos;t have that problem.
				</p>
			</Step>
			<Step n="04" title="Write some code">
				<p className="mt-1 text-xs text-muted-foreground">
					Heartbeats arrive within about two minutes and show up here.
				</p>
			</Step>
		</ol>
	);
}

/** The Zed extension already defaults to the hosted instance; self-hosted ones need `api-url` spelled out. */
function isDefaultServer(apiUrl: string) {
	return apiUrl.replace(/\/+$/, '') === 'https://wakacraft.tech/api/v1';
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
	return (
		<li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
			<span className="tabular text-ember">{n}</span>
			<div className="min-w-0">
				<p className="font-medium">{title}</p>
				{children}
			</div>
		</li>
	);
}

function CopyBlock({ text, label }: { text: string; label: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<div className="relative mt-2">
			<pre className="tabular overflow-x-auto rounded-md border bg-background/70 p-3 pr-12 text-xs leading-relaxed">
				{text}
			</pre>
			<Button
				size="icon"
				variant="ghost"
				className="absolute top-1.5 right-1.5 size-7"
				aria-label={label}
				onClick={async () => {
					await navigator.clipboard.writeText(text);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				}}
			>
				{copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
			</Button>
		</div>
	);
}
