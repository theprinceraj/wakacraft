const GITHUB_API = 'https://api.github.com';
const TIMEOUT_MS = 15_000;
export const COMMITS_PER_PAGE = 30;

export class GithubApiError extends Error {
	public constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = 'GithubApiError';
	}
}

export interface GithubCommit {
	sha: string;
	message: string;
	htmlUrl: string;
	authorName: string | null;
	authorEmail: string | null;
	authorLogin: string | null;
	authorAvatarUrl: string | null;
	authorDate: string;
	committerDate: string;
}

/** `owner/repo` from a GitHub URL (https, ssh or `git@` form), or null for anything that isn't GitHub. */
export function parseGithubRepository(repository: string | null | undefined): { owner: string; repo: string } | null {
	if (!repository) return null;
	const match = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i.exec(repository.trim());
	return match ? { owner: match[1], repo: match[2] } : null;
}

type Raw = {
	sha: string;
	html_url: string;
	commit: {
		message: string;
		author?: { name?: string; email?: string; date?: string };
		committer?: { date?: string };
	};
	author?: { login?: string; avatar_url?: string } | null;
};

export const githubClient = {
	/** The login of the token's owner, used to tell which commits are theirs. */
	async login(token: string): Promise<string | null> {
		try {
			const response = await fetch(`${GITHUB_API}/user`, {
				headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}` },
				signal: AbortSignal.timeout(TIMEOUT_MS),
			});
			if (!response.ok) return null;
			const { login } = (await response.json()) as { login?: string };
			return login ?? null;
		} catch {
			return null;
		}
	},

	/** One page of a branch's commits, newest first. `hasMore` is read from the `Link` header. */
	async commits(
		repo: { owner: string; repo: string },
		{ branch, page, token }: { branch?: string; page: number; token?: string },
	): Promise<{ commits: GithubCommit[]; hasMore: boolean }> {
		const url = new URL(`${GITHUB_API}/repos/${repo.owner}/${repo.repo}/commits`);
		url.searchParams.set('per_page', String(COMMITS_PER_PAGE));
		url.searchParams.set('page', String(page));
		if (branch) url.searchParams.set('sha', branch);

		let response: Response;
		try {
			response = await fetch(url, {
				headers: {
					accept: 'application/vnd.github+json',
					'x-github-api-version': '2022-11-28',
					...(token ? { authorization: `Bearer ${token}` } : {}),
				},
				signal: AbortSignal.timeout(TIMEOUT_MS),
			});
		} catch (error) {
			throw new GithubApiError(0, `Could not reach GitHub: ${(error as Error).message}`);
		}
		if (!response.ok) throw new GithubApiError(response.status, `GitHub answered ${response.status}`);

		const raw = (await response.json()) as Raw[];
		return {
			hasMore: /rel="next"/.test(response.headers.get('link') ?? ''),
			commits: raw.map((item) => ({
				sha: item.sha,
				message: item.commit.message,
				htmlUrl: item.html_url,
				authorName: item.commit.author?.name ?? null,
				authorEmail: item.commit.author?.email ?? null,
				authorLogin: item.author?.login ?? null,
				authorAvatarUrl: item.author?.avatar_url ?? null,
				authorDate: item.commit.author?.date ?? item.commit.committer?.date ?? '',
				committerDate: item.commit.committer?.date ?? item.commit.author?.date ?? '',
			})),
		};
	},
};
