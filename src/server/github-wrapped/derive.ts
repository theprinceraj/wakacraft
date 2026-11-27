import type { GithubContributions } from './github-wrapped.client';

/**
 * Pure: turns one year of a GitHub user's public contributions into the wrapped page's figures. Kept free of I/O so
 * the story it tells is unit-tested.
 */

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];
/** Monday first, the way the page lays the week out. */
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface WrappedDay {
	date: string;
	count: number;
	/** 0 for none, then 1–4 by quartile of the year's non-zero days, as GitHub shades its graph. */
	level: 0 | 1 | 2 | 3 | 4;
}

export interface Archetype {
	key:
		| 'streak'
		| 'reviewer'
		| 'weekend'
		| 'devotee'
		| 'explorer'
		| 'sprinter'
		| 'metronome'
		| 'collaborator'
		| 'steady'
		| 'quiet';
	title: string;
	line: string;
}

export interface GithubWrapped {
	login: string;
	name: string | null;
	avatarUrl: string;
	year: number;
	/** The year is still running: figures run up to `through`. */
	isPartialYear: boolean;
	through: string;
	memberSince: number;
	followers: number;
	total: number;
	commits: number;
	pullRequests: number;
	reviews: number;
	issues: number;
	newRepos: number;
	privateContributions: number;
	activeDays: number;
	daysElapsed: number;
	longestStreak: { days: number; start: string; end: string } | null;
	currentStreak: number;
	bestDay: { date: string; count: number } | null;
	averagePerActiveDay: number;
	weekdays: { name: string; count: number }[];
	busiestWeekday: string | null;
	weekendShare: number;
	months: { name: string; count: number }[];
	busiestMonth: string | null;
	days: WrappedDay[];
	/** Public repositories committed to (GitHub lists at most 25). */
	reposWithCommits: number;
	repos: { name: string; commits: number; language: string | null; color: string | null; stars: number }[];
	languages: { name: string; color: string | null; commits: number; percent: number }[];
	archetype: Archetype;
}

/** Monday = 0 … Sunday = 6 for a `YYYY-MM-DD` calendar date. */
const weekdayIndex = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

const quantile = (sorted: number[], q: number) => sorted[Math.floor(q * (sorted.length - 1))];

function levels(days: { date: string; count: number }[]): WrappedDay[] {
	const active = days
		.map((day) => day.count)
		.filter(Boolean)
		.sort((a, b) => a - b);
	const [q1, q2, q3] = [0.25, 0.5, 0.75].map((q) => quantile(active, q));
	return days.map(({ date, count }) => ({
		date,
		count,
		level: count === 0 ? 0 : count <= q1 ? 1 : count <= q2 ? 2 : count <= q3 ? 3 : 4,
	}));
}

const plural = (count: number, word: string) => `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

/** The first archetype whose bar the year clears, most distinctive first, so each reads as earned. */
export function pickArchetype(stats: Omit<GithubWrapped, 'archetype'>): Archetype {
	const topRepo = stats.repos[0];
	const repoCommits = stats.repos.reduce((sum, repo) => sum + repo.commits, 0);
	const topShare = topRepo && repoCommits ? topRepo.commits / repoCommits : 0;
	const average = stats.averagePerActiveDay;

	if (stats.total < 20) {
		return {
			key: 'quiet',
			title: 'The Quiet Builder',
			line: 'Not every year shows up in green squares. Some of the best work happens off the graph.',
		};
	}
	if (stats.longestStreak && stats.longestStreak.days >= 30) {
		return {
			key: 'streak',
			title: 'The Streak Keeper',
			line: `${plural(stats.longestStreak.days, 'day')} in a row. Your graph doesn't take days off.`,
		};
	}
	if (stats.reviews >= 20 && stats.reviews >= stats.commits * 0.5) {
		return {
			key: 'reviewer',
			title: 'The Gatekeeper',
			line: `${plural(stats.reviews, 'review')}. Half the code that shipped near you went past your eyes first.`,
		};
	}
	if (stats.weekendShare >= 0.35) {
		return {
			key: 'weekend',
			title: 'The Weekend Warrior',
			line: `${Math.round(stats.weekendShare * 100)}% of your contributions landed on a Saturday or Sunday.`,
		};
	}
	if (topRepo && topShare >= 0.6 && topRepo.commits >= 50) {
		return {
			key: 'devotee',
			title: 'The Devotee',
			line: `${Math.round(topShare * 100)}% of your commits went into ${topRepo.name}. That's commitment.`,
		};
	}
	if (stats.reposWithCommits >= 12) {
		return {
			key: 'explorer',
			title: 'The Explorer',
			line: `You committed to ${plural(stats.reposWithCommits, 'repository')}. Restless, curious, everywhere.`,
		};
	}
	if (stats.bestDay && average > 0 && stats.bestDay.count >= average * 8) {
		return {
			key: 'sprinter',
			title: 'The Sprinter',
			line: `Your best day was ${Math.round(stats.bestDay.count / average)}× your average. You code in bursts.`,
		};
	}
	if (stats.daysElapsed && stats.activeDays / stats.daysElapsed >= 0.6) {
		return {
			key: 'metronome',
			title: 'The Metronome',
			line: `Active on ${Math.round((stats.activeDays / stats.daysElapsed) * 100)}% of days. Steady beats flashy.`,
		};
	}
	if (stats.pullRequests >= 10 && stats.pullRequests >= stats.commits * 0.3) {
		return {
			key: 'collaborator',
			title: 'The Collaborator',
			line: `${plural(stats.pullRequests, 'pull request')}. You don't just write code, you ship it with people.`,
		};
	}
	return {
		key: 'steady',
		title: 'The Steady Hand',
		line: `${plural(stats.activeDays, 'day')} of contributions, one green square at a time.`,
	};
}

/**
 * `today` is a `YYYY-MM-DD` date (UTC, as GitHub's calendar is): days after it are dropped, so a running year counts
 * only the days that have happened.
 */
export function deriveGithubWrapped(user: GithubContributions, year: number, today: string): GithubWrapped {
	const collection = user.contributionsCollection;
	const days = collection.contributionCalendar.weeks
		.flatMap((week) => week.contributionDays)
		.filter((day) => day.date.startsWith(`${year}-`) && day.date <= today)
		.map((day) => ({ date: day.date, count: day.contributionCount }))
		.sort((a, b) => a.date.localeCompare(b.date));

	const total = days.reduce((sum, day) => sum + day.count, 0);
	const activeDays = days.filter((day) => day.count > 0).length;

	let longest: GithubWrapped['longestStreak'] = null;
	let runStart = '';
	let run = 0;
	let best: GithubWrapped['bestDay'] = null;
	const weekdays = WEEKDAYS.map((name) => ({ name, count: 0 }));
	const months = MONTHS.map((name) => ({ name, count: 0 }));
	for (const day of days) {
		if (day.count > 0) {
			if (run === 0) runStart = day.date;
			run += 1;
			if (!longest || run > longest.days) longest = { days: run, start: runStart, end: day.date };
		} else run = 0;
		if (day.count > 0 && (!best || day.count > best.count)) best = { date: day.date, count: day.count };
		weekdays[weekdayIndex(day.date)].count += day.count;
		months[Number(day.date.slice(5, 7)) - 1].count += day.count;
	}

	// A streak still runs if today simply hasn't had its contribution yet.
	let currentStreak = 0;
	for (let index = days.length - 1; index >= 0; index -= 1) {
		if (days[index].count > 0) currentStreak += 1;
		else if (index === days.length - 1 && days[index].date === today) continue;
		else break;
	}

	const busiest = <T extends { name: string; count: number }>(items: T[]) =>
		total ? items.reduce((top, item) => (item.count > top.count ? item : top)).name : null;

	const contributed = collection.commitContributionsByRepository;
	const repos = contributed
		.filter((entry) => !entry.repository.isPrivate)
		.map((entry) => ({
			name: entry.repository.nameWithOwner,
			commits: entry.contributions.totalCount,
			language: entry.repository.primaryLanguage?.name ?? null,
			color: entry.repository.primaryLanguage?.color ?? null,
			stars: entry.repository.stargazerCount,
		}))
		.sort((a, b) => b.commits - a.commits);

	const byLanguage = new Map<string, { name: string; color: string | null; commits: number }>();
	for (const repo of repos) {
		if (!repo.language) continue;
		const entry = byLanguage.get(repo.language) ?? { name: repo.language, color: repo.color, commits: 0 };
		entry.commits += repo.commits;
		byLanguage.set(repo.language, entry);
	}
	const languageCommits = [...byLanguage.values()].reduce((sum, language) => sum + language.commits, 0);

	const stats: Omit<GithubWrapped, 'archetype'> = {
		login: user.login,
		name: user.name?.trim() || null,
		avatarUrl: user.avatarUrl,
		year,
		isPartialYear: today < `${year}-12-31`,
		through: days.at(-1)?.date ?? today,
		memberSince: Number(user.createdAt.slice(0, 4)),
		followers: user.followers.totalCount,
		total,
		commits: collection.totalCommitContributions,
		pullRequests: collection.totalPullRequestContributions,
		reviews: collection.totalPullRequestReviewContributions,
		issues: collection.totalIssueContributions,
		newRepos: collection.totalRepositoryContributions,
		privateContributions: collection.restrictedContributionsCount,
		activeDays,
		daysElapsed: days.length,
		longestStreak: longest,
		currentStreak,
		bestDay: best,
		averagePerActiveDay: activeDays ? total / activeDays : 0,
		weekdays,
		busiestWeekday: busiest(weekdays),
		weekendShare: total ? (weekdays[5].count + weekdays[6].count) / total : 0,
		months,
		busiestMonth: busiest(months),
		days: levels(days),
		reposWithCommits: repos.length,
		repos: repos.slice(0, 5),
		languages: [...byLanguage.values()]
			.sort((a, b) => b.commits - a.commits)
			.slice(0, 5)
			.map((language) => ({ ...language, percent: (language.commits / languageCommits) * 100 })),
	};
	return { ...stats, archetype: pickArchetype(stats) };
}
