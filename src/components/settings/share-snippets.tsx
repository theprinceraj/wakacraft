'use client';

import { Check, Copy } from 'lucide-react';

import { useCopy } from '@/components/app/use-copy';
import { Button } from '@/components/ui/button';

function Snippet({ label, preview, markdown }: { label: string; preview: string; markdown: string }) {
	const { copied, copy } = useCopy();
	return (
		<div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-background p-4">
			<div className="flex items-center justify-between gap-2">
				<span className="min-w-0 truncate text-[13px] font-medium">{label}</span>
				<Button size="sm" variant="ghost" onClick={() => copy(markdown)}>
					{copied ? <Check /> : <Copy />} Markdown
				</Button>
			</div>
			{/* eslint-disable-next-line @next/next/no-img-element -- live preview of the exact embed URL */}
			<img src={preview} alt={label} className="max-w-full self-start" loading="lazy" />
		</div>
	);
}

const CHART_LABELS: Record<string, string> = {
	total: 'Lifetime total badge',
	languages: 'Languages card',
	activity: 'Activity card',
	editors: 'Editors card',
};

/** README embeds for the user's public charts and public projects' badges. */
export function ShareSnippets({
	baseUrl,
	username,
	languagesPublic,
	editorsPublic,
	publicProjects,
}: {
	baseUrl: string;
	username: string;
	languagesPublic: boolean;
	editorsPublic: boolean;
	publicProjects: string[];
}) {
	const chart = (name: string) => `${baseUrl}/share/${username}/${name}.svg`;
	const profile = `${baseUrl}/@${username}`;
	// A private breakdown's card is a 403, which a README shows as a broken image; don't offer it.
	const charts = [
		'total',
		...(languagesPublic ? ['languages'] : []),
		'activity',
		...(editorsPublic ? ['editors'] : []),
	];
	const hidden = [!languagesPublic && 'languages', !editorsPublic && 'editors'].filter(Boolean);

	return (
		<div className="flex flex-col gap-3">
			<p className="text-[13px] text-muted-foreground">
				Images update about every 10 minutes and respect your privacy settings. Add{' '}
				<code className="font-mono text-xs">?theme=light</code> for light backgrounds.
			</p>
			<div className="grid gap-3 md:grid-cols-2">
				{charts.map((name) => (
					<Snippet
						key={name}
						label={CHART_LABELS[name]}
						preview={chart(name)}
						markdown={`[![wakacraft ${name}](${chart(name)})](${profile})`}
					/>
				))}
			</div>
			{hidden.length ? (
				<p className="text-[13px] text-muted-foreground">
					Make your {hidden.join(' and ')} public under Public profile to embed{' '}
					{hidden.length > 1 ? 'their cards' : 'its card'}.
				</p>
			) : null}
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
				<p className="text-[13px] text-muted-foreground">
					Mark a project public on its page to get a README badge for it.
				</p>
			)}
		</div>
	);
}
