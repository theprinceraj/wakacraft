import { cacheLife } from 'next/cache';

import { rateLimitService } from '@/server/rate-limit/rate-limit.service';

import { deriveGithubWrapped, type GithubWrapped } from './derive';
import { githubWrappedClient } from './github-wrapped.client';

export type GithubWrappedResult = { status: 'ok'; wrapped: GithubWrapped } | { status: 'not_found' };

/** Today's date as GitHub's contribution calendar counts it (UTC). */
const utcToday = () => new Date().toISOString().slice(0, 10);

/**
 * One GitHub user's year, cached for an hour per login and year so a link going round social media costs GitHub one
 * request an hour, not one per visitor. Errors (no token, GitHub down or rate-limited) throw and are not cached.
 */
async function loadWrapped(login: string, year: number): Promise<GithubWrappedResult> {
	'use cache';
	cacheLife('hours');

	const from = new Date(Date.UTC(year, 0, 1));
	const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
	const user = await githubWrappedClient.contributions(login, from, to);
	if (!user) return { status: 'not_found' };
	return { status: 'ok', wrapped: deriveGithubWrapped(user, year, utcToday()) };
}

class GithubWrappedService {
	/** The current year, the default and the latest a wrapped can be for. */
	public currentYear() {
		return new Date().getUTCFullYear();
	}

	/**
	 * Counts a look-up against the visitor's IP (the page and its share card both call this). Visitors without a
	 * trustworthy IP aren't counted, as on the API. Needs a Mongo connection; throws 429 when exceeded.
	 */
	public async consumeRateLimit(ip: string | null) {
		if (ip) await rateLimitService.consume(`ip:${ip}`, 'github_wrapped');
	}

	/** A requested year within GitHub's history (2008 on) and no later than now; the current year when absent. */
	public clampYear(year?: number) {
		return year === undefined ? this.currentYear() : Math.min(Math.max(year, 2008), this.currentYear());
	}

	/** `year` is clamped as by `clampYear`. Logins are case-insensitive. */
	public get(login: string, year?: number): Promise<GithubWrappedResult> {
		return loadWrapped(login.toLowerCase(), this.clampYear(year));
	}
}

export const githubWrappedService = new GithubWrappedService();
