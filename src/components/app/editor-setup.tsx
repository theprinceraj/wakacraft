'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * The one-time setup that points any WakaTime plugin at wakacraft: install the editor's WakaTime plugin, then
 * set `api_url` (and the key) in ~/.wakatime.cfg. No wakacraft-specific plugin is needed.
 */
export function EditorSetup({ apiUrl, apiKey }: { apiUrl: string; apiKey?: string }) {
	const [copied, setCopied] = useState(false);
	const config = `[settings]\napi_url = ${apiUrl}\napi_key = ${apiKey ?? 'waka_…  # create one in Settings → API keys'}`;

	return (
		<ol className="flex flex-col gap-4 text-sm">
			<li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
				<span className="tabular text-ember">01</span>
				<div>
					<p className="font-medium">Install the WakaTime plugin for your editor</p>
					<p className="mt-1 text-xs text-muted-foreground">
						VS Code, Cursor, JetBrains, Neovim, Zed, Sublime, Xcode and 100+ more. Any WakaTime plugin works — wakacraft
						speaks the same API.
					</p>
				</div>
			</li>
			<li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
				<span className="tabular text-ember">02</span>
				<div className="min-w-0">
					<p className="font-medium">
						Point it at wakacraft in <code className="tabular text-xs">~/.wakatime.cfg</code>
					</p>
					<div className="relative mt-2">
						<pre className="tabular overflow-x-auto rounded-md border bg-background/70 p-3 pr-12 text-xs leading-relaxed">
							{config}
						</pre>
						<Button
							size="icon"
							variant="ghost"
							className="absolute top-1.5 right-1.5 size-7"
							aria-label="Copy configuration"
							onClick={async () => {
								await navigator.clipboard.writeText(config);
								setCopied(true);
								setTimeout(() => setCopied(false), 1500);
							}}
						>
							{copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
						</Button>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						On Windows the file is <code className="tabular">%USERPROFILE%\.wakatime.cfg</code>. Restart your editor
						afterwards.
					</p>
				</div>
			</li>
			<li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
				<span className="tabular text-ember">03</span>
				<div>
					<p className="font-medium">Write some code</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Heartbeats arrive within about two minutes and show up here.
					</p>
				</div>
			</li>
		</ol>
	);
}
