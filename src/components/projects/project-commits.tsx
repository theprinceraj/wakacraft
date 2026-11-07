'use client';

import { ChevronLeft, ChevronRight, GitCommitHorizontal, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';

interface Commit {
	hash: string;
	truncated_hash: string;
	message: string;
	html_url: string;
	author_name: string | null;
	author_username: string | null;
	committer_date: string;
	is_author_found: boolean;
	total_seconds: number;
	human_readable_total: string;
}

interface CommitsPage {
	commits: Commit[];
	next_page: number | null;
	prev_page: number | null;
	can_read_private: boolean;
}

const localDate = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
});

/** The project's GitHub commits with the coding time behind each, loaded from the commits API page by page. */
export function ProjectCommits({ project }: { project: string }) {
	const [page, setPage] = useState(1);
	const [state, setState] = useState<{ data?: CommitsPage; error?: string; loading: boolean }>({ loading: true });

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setState((current) => ({ ...current, loading: true }));
			const response = await fetch(
				`/api/v1/users/current/projects/${encodeURIComponent(project)}/commits?page=${page}`,
			).catch(() => null);
			const json = await response?.json().catch(() => ({}));
			if (cancelled) return;
			if (!response?.ok) setState({ loading: false, error: json?.error ?? 'Could not load commits' });
			else setState({ loading: false, data: json });
		})();
		return () => {
			cancelled = true;
		};
	}, [project, page]);

	const grantPrivate = () =>
		authClient.linkSocial({
			provider: 'github',
			scopes: ['repo'],
			callbackURL: `${window.location.pathname}${window.location.search}#commits`,
		});

	if (state.error) {
		return (
			<div className="flex flex-col items-start gap-3 px-5.5 pb-6 text-sm text-muted-foreground sm:px-7">
				<p>{state.error}</p>
				{/private/.test(state.error) ? (
					<Button size="sm" variant="outline" onClick={grantPrivate}>
						<Lock /> Grant access to private repositories
					</Button>
				) : null}
			</div>
		);
	}
	if (!state.data)
		return <div className="mx-5.5 mb-6 h-40 animate-pulse rounded-2xl bg-accent motion-reduce:animate-none sm:mx-7" />;

	const { commits, next_page, prev_page, can_read_private } = state.data;
	return (
		<div className={cn('flex flex-col transition-opacity', state.loading && 'opacity-60')}>
			{commits.length ? (
				<ul className="divide-y border-y">
					{commits.map((commit) => (
						<li
							key={commit.hash}
							className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 px-5.5 py-3.5 sm:px-7"
						>
							<div className="min-w-0">
								<a
									href={commit.html_url}
									target="_blank"
									rel="noreferrer"
									className="block truncate font-medium transition-colors hover:text-ember-text"
								>
									{commit.message.split('\n')[0]}
								</a>
								<p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
									<GitCommitHorizontal className="mr-1 inline size-3" aria-hidden />
									{commit.truncated_hash} · {commit.author_username ?? commit.author_name ?? 'unknown'} ·{' '}
									{localDate.format(new Date(commit.committer_date))}
								</p>
							</div>
							<span
								className={cn('tabular-nums', commit.is_author_found ? 'font-medium' : 'text-muted-foreground')}
								title={commit.is_author_found ? 'Your coding time since the previous commit' : 'Not your commit'}
							>
								{commit.is_author_found ? commit.human_readable_total : '—'}
							</span>
						</li>
					))}
				</ul>
			) : (
				<p className="border-t px-5 py-8 text-center text-sm text-muted-foreground">No commits on this branch.</p>
			)}
			<div className="flex items-center justify-between gap-3 px-5.5 py-2.5 sm:px-7">
				{!can_read_private ? (
					<button
						type="button"
						onClick={grantPrivate}
						className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
					>
						<Lock className="size-3.5" aria-hidden /> Private repo? Grant access
					</button>
				) : (
					<span />
				)}
				<div className="flex gap-1">
					<Button
						size="icon"
						variant="ghost"
						disabled={!prev_page}
						aria-label="Newer commits"
						onClick={() => setPage(prev_page!)}
					>
						<ChevronLeft />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						disabled={!next_page}
						aria-label="Older commits"
						onClick={() => setPage(next_page!)}
					>
						<ChevronRight />
					</Button>
				</div>
			</div>
		</div>
	);
}
