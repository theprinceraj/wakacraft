'use client';

import { ArrowUpRight, Check, Copy } from 'lucide-react';

import { useCopy } from '@/components/app/use-copy';
import { Button } from '@/components/ui/button';

const VSCODE_EXTENSION_URL = 'https://marketplace.visualstudio.com/items?itemName=wakacraft.wakacraft';
/** Not in Zed's extension registry yet; installed as a dev extension from the repository. */
const ZED_EXTENSION_URL = 'https://github.com/theprinceraj/wakacraft/tree/main/extensions/zed';

const code = 'font-mono text-xs';

/** The Zed extension already defaults to the hosted instance; self-hosted ones need `api-url` spelled out. */
function isDefaultServer(apiUrl: string) {
	return apiUrl.replace(/\/+$/, '') === 'https://wakacraft.tech/api/v1';
}

/**
 * The one-time editor setup. VS Code (and its forks) and Zed get wakacraft's own extensions, which keep their
 * config in `~/.wakacraft` so other plugins can't redirect them. Every other editor uses its WakaTime plugin
 * pointed at wakacraft through `~/.wakatime.cfg`.
 */
export function EditorSetup({ apiUrl, apiKey }: { apiUrl: string; apiKey?: string }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex min-w-0 flex-col rounded-2xl bg-background p-4">
					<p className="font-semibold">VS Code</p>
					<p className="mt-0.5 flex-1 text-[13px] text-muted-foreground">
						Also Cursor, Windsurf and VSCodium. Paste your key when it asks, or run{' '}
						<code className={code}>wakacraft: API Key</code> from the command palette.
					</p>
					<ExtensionLink href={VSCODE_EXTENSION_URL} />
				</div>
				<div className="flex min-w-0 flex-col rounded-2xl bg-background p-4">
					<p className="font-semibold">Zed</p>
					<p className="mt-0.5 flex-1 text-[13px] text-muted-foreground">
						Add the extension, then put your key in Zed&apos;s <code className={code}>settings.json</code>, as below.
					</p>
					<ExtensionLink href={ZED_EXTENSION_URL} />
				</div>
			</div>
			<EditorConfigs apiUrl={apiUrl} apiKey={apiKey} />
		</div>
	);
}

function ExtensionLink({ href }: { href: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="mt-3 self-start text-[13px] font-medium underline decoration-ember decoration-2 underline-offset-[6px] transition-colors hover:text-ember-text"
		>
			get the extension
		</a>
	);
}

/** The two config snippets: Zed's settings and `~/.wakatime.cfg` for every other editor. */
export function EditorConfigs({ apiUrl, apiKey }: { apiUrl: string; apiKey?: string }) {
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
		<div className="flex min-w-0 flex-col gap-4">
			<div className="min-w-0">
				<p className="text-sm font-semibold">Zed settings</p>
				<CopyBlock text={zedSettings} label="Copy Zed settings" />
			</div>
			<div className="min-w-0">
				<p className="text-sm font-semibold">Another editor?</p>
				<p className="mt-0.5 max-w-[64ch] text-[13px] text-muted-foreground">
					JetBrains, Neovim, Sublime, Xcode and 100+ more work through their WakaTime plugin. Point it at wakacraft in{' '}
					<code className={code}>~/.wakatime.cfg</code> (<code className={code}>%USERPROFILE%\.wakatime.cfg</code> on
					Windows). Every WakaTime plugin shares this file, so if one rewrites it your time goes back to WakaTime.
					wakacraft&apos;s own extensions don&apos;t have that problem.
				</p>
				<CopyBlock text={config} label="Copy configuration" />
			</div>
		</div>
	);
}

/** Install buttons for the first-run screen. */
export function ExtensionButtons() {
	return (
		<div className="flex flex-wrap gap-2">
			<Button asChild variant="outline">
				<a href={VSCODE_EXTENSION_URL} target="_blank" rel="noreferrer">
					VS Code <ArrowUpRight />
				</a>
			</Button>
			<Button asChild variant="outline">
				<a href={ZED_EXTENSION_URL} target="_blank" rel="noreferrer">
					Zed <ArrowUpRight />
				</a>
			</Button>
		</div>
	);
}

function CopyBlock({ text, label }: { text: string; label: string }) {
	const { copied, copy } = useCopy();

	return (
		<div className="relative mt-2 min-w-0 rounded-2xl bg-ink text-ink-foreground">
			<pre className="overflow-x-auto py-4 pr-13 pl-4.5 font-mono text-xs leading-relaxed">{text}</pre>
			<Button
				size="icon-sm"
				variant="ghost"
				className="absolute top-2 right-2 text-ink-foreground/70 hover:bg-ink-foreground/12 hover:text-ink-foreground"
				aria-label={label}
				onClick={() => copy(text)}
			>
				{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
			</Button>
		</div>
	);
}
