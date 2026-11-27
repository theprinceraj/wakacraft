import { describe, expect, it } from 'vitest';

import { deriveGithubWrapped } from './derive';
import { GithubLoginSchema } from './github-wrapped.request.dto';

import type { GithubContributions } from './github-wrapped.client';

type Repo = GithubContributions['contributionsCollection']['commitContributionsByRepository'][number];

const repo = (name: string, commits: number, language: string | null, isPrivate = false): Repo => ({
	contributions: { totalCount: commits },
	repository: {
		nameWithOwner: name,
		isPrivate,
		stargazerCount: 0,
		primaryLanguage: language ? { name: language, color: '#123456' } : null,
	},
});

/** A user whose calendar is `counts` laid out day by day from `start`. */
function user(
	start: string,
	counts: number[],
	extra: Partial<GithubContributions['contributionsCollection']> = {},
): GithubContributions {
	const first = new Date(`${start}T00:00:00Z`).getTime();
	const days = counts.map((contributionCount, index) => ({
		date: new Date(first + index * 86_400_000).toISOString().slice(0, 10),
		contributionCount,
	}));
	return {
		login: 'octo',
		name: ' Octo Cat ',
		avatarUrl: 'https://avatars.example/octo',
		createdAt: '2015-04-01T00:00:00Z',
		followers: { totalCount: 3 },
		contributionsCollection: {
			totalCommitContributions: 0,
			totalPullRequestContributions: 0,
			totalPullRequestReviewContributions: 0,
			totalIssueContributions: 0,
			totalRepositoryContributions: 0,
			restrictedContributionsCount: 0,
			contributionCalendar: {
				totalContributions: counts.reduce((sum, count) => sum + count, 0),
				// GitHub groups by week; the grouping doesn't matter to the derivation.
				weeks: [{ contributionDays: days }],
			},
			commitContributionsByRepository: [],
			...extra,
		},
	};
}

describe('deriveGithubWrapped', () => {
	it('finds the longest streak, best day and totals', () => {
		// 2026-01-05 is a Monday.
		const wrapped = deriveGithubWrapped(user('2026-01-05', [1, 2, 3, 0, 5, 1, 0, 9]), 2026, '2026-12-31');
		expect(wrapped.total).toBe(21);
		expect(wrapped.activeDays).toBe(6);
		expect(wrapped.longestStreak).toEqual({ days: 3, start: '2026-01-05', end: '2026-01-07' });
		expect(wrapped.bestDay).toEqual({ date: '2026-01-12', count: 9 });
		expect(wrapped.busiestWeekday).toBe('Monday');
		expect(wrapped.busiestMonth).toBe('January');
		expect(wrapped.weekendShare).toBeCloseTo(1 / 21);
		expect(wrapped.name).toBe('Octo Cat');
		expect(wrapped.memberSince).toBe(2015);
	});

	it('drops days after today and from other years', () => {
		const wrapped = deriveGithubWrapped(user('2025-12-30', [4, 4, 1, 1, 7, 7]), 2026, '2026-01-02');
		expect(wrapped.days.map((day) => day.date)).toEqual(['2026-01-01', '2026-01-02']);
		expect(wrapped.total).toBe(2);
		expect(wrapped.isPartialYear).toBe(true);
		expect(wrapped.through).toBe('2026-01-02');
	});

	it("keeps the current streak alive when today hasn't been contributed to yet", () => {
		const wrapped = deriveGithubWrapped(user('2026-03-01', [0, 1, 1, 1, 0]), 2026, '2026-03-05');
		expect(wrapped.currentStreak).toBe(3);
		expect(deriveGithubWrapped(user('2026-03-01', [1, 0, 0]), 2026, '2026-03-03').currentStreak).toBe(0);
	});

	it('shades days by quartile of the active days', () => {
		const wrapped = deriveGithubWrapped(user('2026-02-02', [0, 1, 2, 3, 4]), 2026, '2026-12-31');
		expect(wrapped.days.map((day) => day.level)).toEqual([0, 1, 2, 3, 4]);
	});

	it('keeps private repositories out of the top repositories and languages', () => {
		const wrapped = deriveGithubWrapped(user('2026-01-01', Array(40).fill(1)), 2026, '2026-12-31');
		expect(wrapped.repos).toEqual([]);
		const withRepos = deriveGithubWrapped(
			user('2026-01-01', Array(40).fill(1), {
				commitContributionsByRepository: [
					repo('octo/secret', 90, 'Go', true),
					repo('octo/b', 10, 'Rust'),
					repo('octo/a', 30, 'TypeScript'),
					repo('octo/c', 10, 'TypeScript'),
					repo('octo/d', 5, null),
				],
			}),
			2026,
			'2026-12-31',
		);
		expect(withRepos.repos.map((item) => item.name)).toEqual(['octo/a', 'octo/b', 'octo/c', 'octo/d']);
		expect(withRepos.languages.map((language) => [language.name, language.percent])).toEqual([
			['TypeScript', 80],
			['Rust', 20],
		]);
		expect(withRepos.reposWithCommits).toBe(4);
	});

	it('handles a year with no contributions', () => {
		const wrapped = deriveGithubWrapped(user('2026-01-01', [0, 0, 0]), 2026, '2026-12-31');
		expect(wrapped.longestStreak).toBeNull();
		expect(wrapped.bestDay).toBeNull();
		expect(wrapped.busiestMonth).toBeNull();
		expect(wrapped.archetype.key).toBe('quiet');
	});
});

describe('archetypes', () => {
	const archetypeOf = (counts: number[], extra: Partial<GithubContributions['contributionsCollection']> = {}) =>
		deriveGithubWrapped(user('2026-01-05', counts, extra), 2026, '2026-12-31').archetype;

	it('names a month-long streak first', () => {
		expect(archetypeOf(Array(30).fill(2)).key).toBe('streak');
	});

	it('names weekend-heavy years', () => {
		// Mon–Fri 1 each, Sat–Sun 5 each, for 4 weeks (a 28-day streak): weekend share 40/60.
		const week = [1, 1, 1, 1, 1, 5, 5];
		expect(archetypeOf(week.concat(week, week, week)).key).toBe('weekend');
	});

	it('names reviewers', () => {
		expect(
			archetypeOf([5, 5, 5, 5, 0, 5, 5], { totalPullRequestReviewContributions: 25, totalCommitContributions: 10 }).key,
		).toBe('reviewer');
	});

	it('names explorers by the repositories committed to', () => {
		const repos = Array.from({ length: 12 }, (_, index) => repo(`octo/r${index}`, 2, 'Go'));
		expect(archetypeOf([5, 5, 5, 5, 0, 5, 5], { commitContributionsByRepository: repos }).key).toBe('explorer');
	});
});

describe('GithubLoginSchema', () => {
	it('accepts logins with or without @', () => {
		expect(GithubLoginSchema.parse(' @Octo-Cat ')).toBe('Octo-Cat');
	});

	it.each(['-octo', 'octo-', 'oc--to', 'a'.repeat(40), 'octo/cat', ''])('rejects %j', (login) => {
		expect(GithubLoginSchema.safeParse(login).success).toBe(false);
	});
});
