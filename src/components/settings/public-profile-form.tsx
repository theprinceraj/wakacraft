'use client';

import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import type { UserResponse } from '@/server/user/user.response.dto';

const TOGGLES = [
	[
		'loggedTimePublic',
		'logged_time_public',
		'Show coding time',
		'Totals, heatmap and daily average on your profile and leaderboards.',
	],
	['languagesUsedPublic', 'languages_used_public', 'Show languages', null],
	['editorsUsedPublic', 'editors_used_public', 'Show editors', null],
	['categoriesUsedPublic', 'categories_used_public', 'Show categories', null],
	['osUsedPublic', 'os_used_public', 'Show operating systems', null],
	['isEmailPublic', 'is_email_public', 'Show email address', null],
	['isPhotoPublic', 'is_photo_public', 'Show profile photo', null],
	['isHireable', 'is_hireable', 'Open to work', 'Adds a badge to your profile and leaderboard entry.'],
] as const;

type ToggleKey = (typeof TOGGLES)[number][0];

const BREAKDOWNS = new Set<ToggleKey>([
	'languagesUsedPublic',
	'editorsUsedPublic',
	'categoriesUsedPublic',
	'osUsedPublic',
]);

export function PublicProfileForm({ user, baseUrl }: { user: UserResponse; baseUrl: string }) {
	const router = useRouter();
	const [text, setText] = useState({
		bio: user.bio ?? '',
		website: user.website ?? '',
		githubUsername: user.github_username ?? '',
		twitterUsername: user.twitter_username ?? '',
		linkedinUsername: user.linkedin_username ?? '',
		city: user.city?.name ?? '',
	});
	const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>(
		Object.fromEntries(TOGGLES.map(([key, wire]) => [key, user[wire]])) as Record<ToggleKey, boolean>,
	);
	const [pending, setPending] = useState(false);

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const response = await fetch('/api/v1/users/current', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				...toggles,
				bio: text.bio.trim() || undefined,
				website: text.website.trim() || undefined,
				githubUsername: text.githubUsername.trim() || undefined,
				twitterUsername: text.twitterUsername.trim() || undefined,
				linkedinUsername: text.linkedinUsername.trim() || undefined,
				...(text.city.trim() ? { city: { name: text.city.trim() } } : {}),
			}),
		});
		setPending(false);
		const json = await response.json();
		if (!response.ok) {
			toast.error(json.error ?? 'Could not save your profile');
			return;
		}
		toast.success('Profile saved');
		router.refresh();
	}

	const field = (key: keyof typeof text, label: string, placeholder = '') => (
		<div className="grid gap-1.5">
			<Label htmlFor={key} className="text-xs">
				{label}
			</Label>
			<Input
				id={key}
				value={text[key]}
				placeholder={placeholder}
				onChange={(event) => setText({ ...text, [key]: event.target.value })}
			/>
		</div>
	);

	return (
		<form onSubmit={save} className="flex flex-col gap-5">
			{user.username ? (
				<a
					href={`/@${user.username}`}
					target="_blank"
					rel="noreferrer"
					className="tabular inline-flex items-center gap-1.5 self-start text-xs text-ember hover:underline"
				>
					{baseUrl.replace(/^https?:\/\//, '')}/@{user.username} <ExternalLink className="size-3" />
				</a>
			) : (
				<p className="text-xs text-muted-foreground">Set a username under Preferences to get a public profile URL.</p>
			)}

			<div className="grid gap-1.5">
				<Label htmlFor="bio" className="text-xs">
					Bio
				</Label>
				<textarea
					id="bio"
					maxLength={500}
					rows={2}
					value={text.bio}
					onChange={(event) => setText({ ...text, bio: event.target.value })}
					className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				{field('website', 'Website', 'https://')}
				{field('city', 'Location', 'City')}
				{field('githubUsername', 'GitHub')}
				{field('twitterUsername', 'X / Twitter')}
				{field('linkedinUsername', 'LinkedIn')}
			</div>

			<div className="grid gap-2 sm:grid-cols-2">
				{TOGGLES.map(([key, , label, hint]) => (
					<label key={key} className="flex items-start justify-between gap-3 rounded-md border p-3">
						<span>
							<span className="block text-sm">{label}</span>
							{hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
						</span>
						<Switch
							checked={toggles[key]}
							onCheckedChange={(checked) => setToggles({ ...toggles, [key]: checked })}
							// Breakdowns are only shown alongside public coding time.
							disabled={BREAKDOWNS.has(key) && !toggles.loggedTimePublic}
						/>
					</label>
				))}
			</div>

			<Button type="submit" disabled={pending} className="self-start">
				{pending ? 'Saving…' : 'Save profile'}
			</Button>
		</form>
	);
}
