import { z } from 'zod';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const TIMEOUT_MS = 15_000;

export class GithubWrappedError extends Error {
	public constructor(
		public readonly reason: 'not_configured' | 'rate_limited' | 'unavailable',
		message: string,
	) {
		super(message);
		this.name = 'GithubWrappedError';
	}
}

const QUERY = /* GraphQL */ `
	query Wrapped($login: String!, $from: DateTime!, $to: DateTime!) {
		user(login: $login) {
			login
			name
			avatarUrl(size: 256)
			createdAt
			followers {
				totalCount
			}
			contributionsCollection(from: $from, to: $to) {
				totalCommitContributions
				totalPullRequestContributions
				totalPullRequestReviewContributions
				totalIssueContributions
				totalRepositoryContributions
				restrictedContributionsCount
				contributionCalendar {
					totalContributions
					weeks {
						contributionDays {
							date
							contributionCount
						}
					}
				}
				commitContributionsByRepository(maxRepositories: 25) {
					contributions {
						totalCount
					}
					repository {
						nameWithOwner
						isPrivate
						stargazerCount
						primaryLanguage {
							name
							color
						}
					}
				}
			}
		}
	}
`;

/** The slice of GitHub's GraphQL `User` the wrapped page reads. */
export const GithubContributionsSchema = z.object({
	login: z.string(),
	name: z.string().nullable(),
	avatarUrl: z.string(),
	createdAt: z.string(),
	followers: z.object({ totalCount: z.number() }),
	contributionsCollection: z.object({
		totalCommitContributions: z.number(),
		totalPullRequestContributions: z.number(),
		totalPullRequestReviewContributions: z.number(),
		totalIssueContributions: z.number(),
		totalRepositoryContributions: z.number(),
		restrictedContributionsCount: z.number(),
		contributionCalendar: z.object({
			totalContributions: z.number(),
			weeks: z.array(
				z.object({ contributionDays: z.array(z.object({ date: z.string(), contributionCount: z.number() })) }),
			),
		}),
		commitContributionsByRepository: z.array(
			z.object({
				contributions: z.object({ totalCount: z.number() }),
				repository: z.object({
					nameWithOwner: z.string(),
					isPrivate: z.boolean(),
					stargazerCount: z.number(),
					primaryLanguage: z.object({ name: z.string(), color: z.string().nullable() }).nullable(),
				}),
			}),
		),
	}),
});

export type GithubContributions = z.infer<typeof GithubContributionsSchema>;

const ResponseSchema = z.object({
	data: z.object({ user: GithubContributionsSchema.nullable() }).nullable().optional(),
	errors: z.array(z.object({ type: z.string().optional(), message: z.string() })).optional(),
});

export const githubWrappedClient = {
	/**
	 * A user's public profile and contributions between `from` and `to` (at most a year apart), or null when no such
	 * user exists. Needs `GITHUB_TOKEN`: GitHub's GraphQL API has no anonymous access.
	 */
	async contributions(login: string, from: Date, to: Date): Promise<GithubContributions | null> {
		const token = process.env.GITHUB_TOKEN?.trim();
		if (!token) throw new GithubWrappedError('not_configured', 'GITHUB_TOKEN is not set');

		let response: Response;
		try {
			response = await fetch(GITHUB_GRAPHQL, {
				method: 'POST',
				headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'wakacraft' },
				body: JSON.stringify({ query: QUERY, variables: { login, from: from.toISOString(), to: to.toISOString() } }),
				signal: AbortSignal.timeout(TIMEOUT_MS),
			});
		} catch (error) {
			throw new GithubWrappedError('unavailable', `Could not reach GitHub: ${(error as Error).message}`);
		}
		if (response.status === 403 || response.status === 429) {
			throw new GithubWrappedError('rate_limited', `GitHub answered ${response.status}`);
		}
		if (!response.ok) throw new GithubWrappedError('unavailable', `GitHub answered ${response.status}`);

		const parsed = ResponseSchema.safeParse(await response.json());
		if (!parsed.success) throw new GithubWrappedError('unavailable', 'GitHub sent an unexpected response');
		const { data, errors } = parsed.data;
		if (errors?.some((error) => error.type === 'NOT_FOUND')) return null;
		if (errors?.some((error) => error.type === 'RATE_LIMITED')) {
			throw new GithubWrappedError('rate_limited', 'GitHub rate limit reached');
		}
		if (errors?.length || !data) {
			throw new GithubWrappedError('unavailable', errors?.[0]?.message ?? 'GitHub sent no data');
		}
		return data.user;
	},
};
