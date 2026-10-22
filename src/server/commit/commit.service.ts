import { getGithubToken } from '@/lib/auth/github-token';
import { BadRequestException } from '@/lib/http/errors';
import { humanizeSeconds, round } from '@/lib/util/Time';
import { projectService } from '@/server/project/project.service';
import { loadActivity } from '@/server/stats/activity-stream';
import { heartbeatFilter } from '@/server/stats/day-totals';
import { creditSeconds } from '@/server/stats/engine';
import { statsService } from '@/server/stats/stats.service';
import { userService } from '@/server/user/user.service';

import {
	COMMITS_PER_PAGE,
	GithubApiError,
	githubClient,
	parseGithubRepository,
	type GithubCommit,
} from './github.client';

import type { CommitsQuery } from './commit.request.dto';

/** Time before a page's oldest known boundary that can still count toward a commit. */
const MAX_WINDOW_SECONDS = 30 * 86_400;

const epoch = (iso: string) => Math.floor(Date.parse(iso) / 1000);

class CommitService {
	/**
	 * WakaTime's `projects/:project/commits`: a page of the project's GitHub commits, each with the coding time you
	 * spent on the project between the previous commit and it. Only your own commits get time.
	 */
	public async getCommits(userId: string, projectName: string, query: CommitsQuery) {
		const project = await projectService.getByName(userId, projectName);
		const repo = parseGithubRepository(project.repository);
		if (!repo) {
			throw new BadRequestException('Set this project’s GitHub repository URL in its settings to see commits');
		}

		const github = await getGithubToken(userId);
		const fetchPage = async (page: number) => {
			try {
				return await githubClient.commits(repo, { branch: query.branch, page, token: github?.token });
			} catch (error) {
				if (error instanceof GithubApiError && error.status === 404) {
					throw new BadRequestException(
						github?.scopes.includes('repo')
							? `GitHub can't find ${repo.owner}/${repo.repo}${query.branch ? ` (branch ${query.branch})` : ''}`
							: `GitHub can't find ${repo.owner}/${repo.repo}. If it's private, grant wakacraft access to private repositories.`,
					);
				}
				throw new BadRequestException(error instanceof Error ? error.message : 'GitHub request failed');
			}
		};

		const { commits, hasMore } = await fetchPage(query.page);
		// The page's oldest commit is measured from the newest commit of the next page.
		const boundary = hasMore ? (await fetchPage(query.page + 1)).commits[0] : undefined;

		const [settings, user, login] = await Promise.all([
			statsService.resolveSettings(userId),
			userService.getCurrentUser(userId),
			github ? githubClient.login(github.token) : Promise.resolve(null),
		]);
		const logins = new Set([login, user.github_username].filter(Boolean).map((value) => value!.toLowerCase()));
		const isMine = (commit: GithubCommit) =>
			(commit.authorLogin !== null && logins.has(commit.authorLogin.toLowerCase())) ||
			(commit.authorEmail !== null && commit.authorEmail.toLowerCase() === user.email?.toLowerCase());

		// Oldest first, so each commit's window starts at the previous one.
		const ordered = [...commits].reverse();
		const times = ordered.map((commit) => epoch(commit.committerDate));
		const firstStart = boundary ? epoch(boundary.committerDate) : times.length ? times[0] - MAX_WINDOW_SECONDS : 0;
		const windowStart = (index: number) =>
			Math.max(index === 0 ? firstStart : times[index - 1], times[index] - MAX_WINDOW_SECONDS);

		const seconds = new Array<number>(ordered.length).fill(0);
		if (ordered.length && ordered.some(isMine)) {
			const start = Math.min(...ordered.map((_, index) => windowStart(index)));
			const end = Math.max(...times) + 1;
			const heartbeats = await loadActivity(
				userId,
				start,
				end,
				heartbeatFilter(settings, { project: project.name, branches: query.branch ? [query.branch] : undefined }),
			);
			const credits = creditSeconds(heartbeats, { timeoutSeconds: settings.timeoutMinutes * 60, rangeEnd: end });
			let cursor = 0;
			ordered.forEach((commit, index) => {
				const from = windowStart(index);
				while (cursor < heartbeats.length && heartbeats[cursor].time <= from) cursor++;
				let total = 0;
				let scan = cursor;
				while (scan < heartbeats.length && heartbeats[scan].time <= times[index]) total += credits[scan++];
				if (isMine(commit)) seconds[index] = total;
			});
		}

		const data = ordered
			.map((commit, index) => ({
				hash: commit.sha,
				truncated_hash: commit.sha.slice(0, 7),
				message: commit.message,
				html_url: commit.htmlUrl,
				url: commit.htmlUrl,
				branch: query.branch ?? null,
				author_name: commit.authorName,
				author_email: commit.authorEmail,
				author_username: commit.authorLogin,
				author_avatar_url: commit.authorAvatarUrl,
				author_date: commit.authorDate,
				committer_date: commit.committerDate,
				is_author_found: isMine(commit),
				total_seconds: round(seconds[index]),
				human_readable_total: humanizeSeconds(seconds[index]),
			}))
			.reverse();

		return {
			commits: data,
			project: { name: project.name, repository: { full_name: `${repo.owner}/${repo.repo}`, provider: 'github' } },
			branch: query.branch ?? null,
			page: query.page,
			prev_page: query.page > 1 ? query.page - 1 : null,
			next_page: hasMore ? query.page + 1 : null,
			per_page: COMMITS_PER_PAGE,
			can_read_private: Boolean(github?.scopes.includes('repo')),
			status: 'ok',
		};
	}
}

export const commitService = new CommitService();
