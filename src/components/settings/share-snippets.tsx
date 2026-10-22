'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

function Snippet({ label, preview, markdown }: { label: string; preview: string; markdown: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="flex flex-col gap-2 rounded-md border p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-medium">{label}</span>
				<Button
					size="sm"
					variant="ghost"
					className="h-7"
					onClick={async () => {
						await navigator.clipboard.writeText(markdown);
						setCopied(true);
						setTimeout(() => setCopied(false), 1500);
					}}
				>
					{copied ? <Check className="text-success" /> : <Copy />} Markdown
				</Button>
			</div>
			{/* eslint-disable-next-line @next/next/no-img-element -- live preview of the exact embed URL */}
			<img src={preview} alt={label} className="max-w-full self-start" loading="lazy" />
		</div>
	);
}

/** README embeds for the user's public charts and public projects' badges. */
export function ShareSnippets({
	baseUrl,
	username,
	publicProjects,
}: {
	baseUrl: string;
	username: string;
	publicProjects: string[];
}) {
	const chart = (name: string) => `${baseUrl}/share/${username}/${name}.svg`;
	const profile = `${baseUrl}/@${username}`;

	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-muted-foreground">
				Images update about every 10 minutes and respect your privacy settings. Add{' '}
				<code className="tabular">?theme=light</code> for light backgrounds.
			</p>
			<div className="grid gap-3 md:grid-cols-2">
				{['languages', 'activity', 'editors'].map((name) => (
					<Snippet
						key={name}
						label={`${name[0].toUpperCase()}${name.slice(1)} card`}
						preview={chart(name)}
						markdown={`[![wakacraft ${name}](${chart(name)})](${profile})`}
					/>
				))}
			</div>
			{publicProjects.length ? (
				<div className="grid gap-3 md:grid-cols-2">
					{publicProjects.map((project) => {
						const badge = `${baseUrl}/api/v1/users/${username}/badges/projects/${encodeURIComponent(project)}.svg`;
						return (
							<Snippet
								key={project}
								label={`${project} badge`}
								preview={badge}
								markdown={`[![wakacraft](${badge})](${profile})`}
							/>
						);
					})}
				</div>
			) : (
				<p className="text-xs text-muted-foreground">Mark a project public on its page to get a README badge for it.</p>
			)}
		</div>
	);
}
