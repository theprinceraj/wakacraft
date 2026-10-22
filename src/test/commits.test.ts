import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET as getCommits } from '@/app/api/v1/users/[user]/projects/[id]/commits/route';
import { connectMongo } from '@/lib/mongo/connection';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { parseGithubRepository } from '@/server/commit/github.client';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { projectService } from '@/server/project/project.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { basicAuth, call } from './api';
import { signUpTestUser } from './users';

const EMAIL = 'commits@wakacraft.test';
const base = Math.floor(Date.UTC(2026, 9, 1, 0, 0, 0) / 1000);
const at = (hours: number, minutes = 0) => base + hours * 3600 + minutes * 60;
const iso = (epoch: number) => new Date(epoch * 1000).toISOString();
let userId: string;
let apiKey: string;

// Newest first, as GitHub returns them.
const githubCommits = [
	{ sha: 'c'.repeat(40), when: at(12), email: 'someone@else.test', login: 'someone', message: 'Their fix' },
	{ sha: 'b'.repeat(40), when: at(11), email: EMAIL, login: null, message: 'Add feature' },
	{ sha: 'a'.repeat(40), when: at(10), email: EMAIL, login: null, message: 'Initial commit' },
].map((commit) => ({
	sha: commit.sha,
	html_url: `https://github.com/acme/widgets/commit/${commit.sha}`,
	commit: {
		message: commit.message,
		author: { name: 'Dev', email: commit.email, date: iso(commit.when) },
		committer: { date: iso(commit.when) },
	},
	author: commit.login ? { login: commit.login, avatar_url: null } : null,
}));

const work = (fromHour: number, fromMinute: number, minutes: number) =>
	heartbeatService.ingest(
		userId,
		Array.from({ length: minutes + 1 }, (_, index) => ({
			entity: '/src/widget.ts',
			type: 'file',
			project: 'widgets',
			time: at(fromHour, fromMinute + index),
		})),
		{ userAgent: null, machineName: null, historical: true },
	);

beforeAll(async () => {
	await connectMongo();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string | URL | Request) => {
			const url = new URL(String(input));
			if (url.pathname === '/repos/acme/widgets/commits') {
				return new Response(JSON.stringify(githubCommits), { status: 200 });
			}
			return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
		}),
	);
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: EMAIL, name: 'Committer' } }));
	await userProfileService.updateSettings(userId, { timezone: 'UTC' });
	({ key: apiKey } = await apiKeyService.create(userId, 'commits'));
	await work(9, 30, 20); // before the first commit
	await work(10, 15, 30); // between the first and second
	await work(11, 10, 10); // before someone else's commit
	const project = await projectService.getByName(userId, 'widgets');
	await projectService.update(userId, project.id, { repository: 'https://github.com/acme/widgets.git' });
});

afterAll(async () => {
	vi.unstubAllGlobals();
	await (await connectMongo()).disconnect();
});

describe('commits', () => {
	it('parses GitHub repository URLs', () => {
		expect(parseGithubRepository('https://github.com/acme/widgets')).toEqual({ owner: 'acme', repo: 'widgets' });
		expect(parseGithubRepository('git@github.com:acme/widgets.git')).toEqual({ owner: 'acme', repo: 'widgets' });
		expect(parseGithubRepository('https://gitlab.com/acme/widgets')).toBeNull();
	});

	it('credits your time since the previous commit to each of your commits', async () => {
		const { status, json } = await call(getCommits, {
			path: '/api/v1/users/current/projects/widgets/commits',
			params: { id: 'widgets' },
			headers: basicAuth(apiKey),
		});
		expect(status).toBe(200);
		expect(
			json.commits.map((commit: { truncated_hash: string; total_seconds: number; is_author_found: boolean }) => [
				commit.truncated_hash,
				commit.is_author_found,
				commit.total_seconds,
			]),
		).toEqual([
			['ccccccc', false, 0],
			['bbbbbbb', true, 30 * 60],
			['aaaaaaa', true, 20 * 60],
		]);
		expect(json).toMatchObject({ project: { repository: { full_name: 'acme/widgets' } }, next_page: null });
	});

	it('explains what to do without a GitHub repository', async () => {
		await heartbeatService.ingest(
			userId,
			[{ entity: '/notes.md', type: 'file', project: 'no-repo', time: at(14) }],
			{ userAgent: null, machineName: null, historical: true },
		);
		const { status, json } = await call(getCommits, {
			path: '/api/v1/users/current/projects/no-repo/commits',
			params: { id: 'no-repo' },
			headers: basicAuth(apiKey),
		});
		expect(status).toBe(400);
		expect(json.error).toMatch(/repository URL/);
	});
});
