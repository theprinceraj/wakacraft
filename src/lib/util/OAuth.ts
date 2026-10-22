/** WakaTime's OAuth scopes that wakacraft grants, with what the consent screen says each one allows. */
export const OAuthScopeDescriptions = {
	email: 'See your email address',
	read_summaries: 'Read your daily summaries, status bar time and projects',
	read_stats: 'Read your stats, insights and all-time totals',
	read_goals: 'Read your goals and their progress',
	read_heartbeats: 'Read your raw activity: heartbeats, durations, machines and editors',
	write_heartbeats: 'Send heartbeats and external durations on your behalf',
	read_orgs: 'Read your teams, their dashboards and teammates’ time on them',
	read_private_leaderboards: 'Read the private leaderboards you belong to',
} as const;

export type OAuthScope = keyof typeof OAuthScopeDescriptions;
export const OAuthScopesList = Object.keys(OAuthScopeDescriptions) as OAuthScope[];
export const isOAuthScope = (value: string): value is OAuthScope => value in OAuthScopeDescriptions;

/** Access tokens and refresh tokens use WakaTime's prefixes, so clients that sniff them keep working. */
export const ACCESS_TOKEN_PREFIX = 'waka_tok_';
export const REFRESH_TOKEN_PREFIX = 'waka_ref_';
export const CLIENT_SECRET_PREFIX = 'waka_sec_';
