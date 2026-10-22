import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getApiKeys } from '@/app/api/v1/users/[user]/api_keys/route';
import { GET as getDurations } from '@/app/api/v1/users/[user]/durations/route';
import { POST as postBulk } from '@/app/api/v1/users/[user]/heartbeats.bulk/route';
import { GET as getHeartbeats } from '@/app/api/v1/users/[user]/heartbeats/route';
import { GET as getMachines } from '@/app/api/v1/users/[user]/machine_names/route';
import { GET as getProjects } from '@/app/api/v1/users/[user]/projects/route';
import { GET as getUser } from '@/app/api/v1/users/[user]/route';
import { GET as getStats } from '@/app/api/v1/users/[user]/stats/[range]/route';
import { GET as getStatusBar } from '@/app/api/v1/users/[user]/statusbar/today/route';
import { GET as getSummaries } from '@/app/api/v1/users/[user]/summaries/route';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';

import { basicAuth, call, CLI_USER_AGENT } from './api';
import { signUpTestUser } from './users';

const cliHeaders = (apiKey: string) => ({
	...basicAuth(apiKey),
	'user-agent': CLI_USER_AGENT,
	'x-machine-name': 'laptop',
});

// Activity is placed on yesterday (UTC) so the day is complete and eligible for rollup caching.
const yesterday = addDays(todayIn('UTC'), -1);
const t0 = localDayBounds(yesterday, 'UTC').start + 10 * 3600;

const heartbeat = (offset: number, overrides: Record<string, unknown> = {}) => ({
	entity: 'D:\\code\\api\\src\\server.ts',
	type: 'file',
	category: 'coding',
	time: t0 + offset,
	project: 'api',
	branch: 'main',
	language: 'TypeScript',
	dependencies: ['zod', 'mongoose'],
	lines: 120,
	lineno: 10,
	cursorpos: 4,
	is_write: false,
	...overrides,
});

let userId: string;
let apiKey: string;

beforeAll(async () => {
	await connectMongo();
	const { user } = await signUpTestUser({
		body: { email: 'dev@wakacraft.test', password: 'correct-horse-battery', name: 'Dev' },
	});
	userId = user.id;
	({ key: apiKey } = await apiKeyService.create(userId, 'Laptop'));
});

afterAll(async () => {
	const mongoose = await connectMongo();
	await mongoose.disconnect();
});

describe('heartbeat ingestion (wakatime-cli wire format)', () => {
	it('rejects requests without a valid API key', async () => {
		expect(
			(await call(postBulk, { path: '/api/v1/users/current/heartbeats.bulk', method: 'POST', body: [heartbeat(0)] }))
				.status,
		).toBe(401);
		const wrongKey = await call(postBulk, {
			path: '/api/v1/users/current/heartbeats.bulk',
			method: 'POST',
			body: [heartbeat(0)],
			headers: basicAuth('waka_00000000-0000-4000-8000-000000000000'),
		});
		expect(wrongKey.status).toBe(401);
	});

	it('accepts a bulk request and reports per-heartbeat status', async () => {
		const { status, json } = await call(postBulk, {
			path: '/api/v1/users/current/heartbeats.bulk',
			method: 'POST',
			headers: cliHeaders(apiKey),
			body: [
				heartbeat(0),
				heartbeat(120, { is_write: true }),
				heartbeat(300),
				heartbeat(360, { project: 'web', entity: '/web/app.css', language: 'CSS', dependencies: undefined }),
				heartbeat(400, { type: 'spaceship' }),
			],
		});

		expect(status).toBe(202);
		expect(json.responses).toHaveLength(5);
		for (const [body, itemStatus] of json.responses.slice(0, 4)) {
			expect(itemStatus).toBe(201);
			expect(body.data.id).toMatch(/^\d+$/);
		}
		const [errorBody, errorStatus] = json.responses[4];
		expect(errorStatus).toBe(400);
		expect(errorBody.errors.type).toBeDefined();
	});

	it('treats offline-queue resends as already stored, returning the original ids', async () => {
		const first = await mongoHeartbeatService.count({ userId });
		const { json } = await call(postBulk, {
			path: '/api/v1/users/current/heartbeats.bulk',
			method: 'POST',
			headers: cliHeaders(apiKey),
			body: [heartbeat(0)],
		});

		const [stored] = await mongoHeartbeatService.find({ userId, time: t0 }, ['id']);
		expect(json.responses[0]).toEqual([
			{ data: { id: stored.id, entity: heartbeat(0).entity, type: 'file', time: t0 } },
			201,
		]);
		expect(await mongoHeartbeatService.count({ userId })).toBe(first);
	});

	it('parses the user agent and machine onto each heartbeat', async () => {
		const { json } = await call(getHeartbeats, {
			path: `/api/v1/users/current/heartbeats?date=${yesterday}`,
			headers: basicAuth(apiKey),
		});
		expect(json.data).toHaveLength(4);
		expect(json.data[0]).toMatchObject({
			project: 'api',
			machine_name_id: 'laptop',
			dependencies: ['zod', 'mongoose'],
		});

		const machines = await call(getMachines, {
			path: '/api/v1/users/current/machine_names',
			headers: basicAuth(apiKey),
		});
		expect(machines.json.data.map((machine: { name: string }) => machine.name)).toEqual(['laptop']);
	});
});

describe('stats endpoints', () => {
	// Credits: 0→120 = 120s, 120→300 = 180s (api), 300→360 = 60s (api), 360 = last heartbeat, 0s (web).
	it('summarizes a day per WakaTime rules', async () => {
		const { status, json } = await call(getSummaries, {
			path: `/api/v1/users/current/summaries?start=${yesterday}&end=${yesterday}&timezone=UTC`,
			headers: basicAuth(apiKey),
		});

		expect(status).toBe(200);
		const [day] = json.data;
		expect(day.grand_total).toMatchObject({ total_seconds: 360, text: '6 mins', digital: '0:06' });
		expect(day.projects).toEqual([expect.objectContaining({ name: 'api', total_seconds: 360, percent: 100 })]);
		expect(day.editors[0]).toMatchObject({ name: 'VS Code', total_seconds: 360 });
		expect(day.operating_systems[0]).toMatchObject({ name: 'Windows' });
		expect(day.machines[0]).toMatchObject({ name: 'laptop' });
		expect(day.dependencies.map((d: { name: string }) => d.name).sort()).toEqual(['mongoose', 'zod']);
		expect(day.range).toMatchObject({ date: yesterday, timezone: 'UTC' });
		expect(json.cumulative_total).toMatchObject({ seconds: 360 });
		expect(json.daily_average).toMatchObject({ days_including_holidays: 1, days_minus_holidays: 1, seconds: 360 });
	});

	it('caches finished days and invalidates the cache when a late heartbeat arrives', async () => {
		expect(await mongoDailySummaryService.count({ userId, date: yesterday })).toBe(1);

		await call(postBulk, {
			path: '/api/v1/users/current/heartbeats.bulk',
			method: 'POST',
			headers: cliHeaders(apiKey),
			body: [heartbeat(600, { project: 'web', entity: '/web/app.css', language: 'CSS' })],
		});
		expect(await mongoDailySummaryService.count({ userId, date: yesterday })).toBe(0);

		const { json } = await call(getSummaries, {
			path: `/api/v1/users/current/summaries?start=${yesterday}&end=${yesterday}&timezone=UTC`,
			headers: basicAuth(apiKey),
		});
		// The web heartbeat at 360 now continues to 600: +240s.
		expect(json.data[0].grand_total.total_seconds).toBe(600);
		expect(
			json.data[0].projects.map((p: { name: string; total_seconds: number }) => [p.name, p.total_seconds]),
		).toEqual([
			['api', 360],
			['web', 240],
		]);
	});

	it('returns the timeline as durations, optionally sliced by language', async () => {
		const byProject = await call(getDurations, {
			path: `/api/v1/users/current/durations?date=${yesterday}&timezone=UTC`,
			headers: basicAuth(apiKey),
		});
		expect(
			byProject.json.data.map((d: { project: string; time: number; duration: number }) => [
				d.project,
				d.time - t0,
				d.duration,
			]),
		).toEqual([
			['api', 0, 360],
			['web', 360, 240],
		]);

		const byLanguage = await call(getDurations, {
			path: `/api/v1/users/current/durations?date=${yesterday}&timezone=UTC&slice_by=language`,
			headers: basicAuth(apiKey),
		});
		expect(byLanguage.json.data.map((d: { language: string }) => d.language)).toEqual(['TypeScript', 'CSS']);
	});

	it('computes stats for a range with a best day', async () => {
		const { json } = await call(getStats, {
			path: '/api/v1/users/current/stats/last_7_days?timezone=UTC',
			params: { range: 'last_7_days' },
			headers: basicAuth(apiKey),
		});
		expect(json.data).toMatchObject({
			range: 'last_7_days',
			total_seconds_including_other_language: 600,
			days_including_holidays: 7,
			days_minus_holidays: 1,
			best_day: { date: yesterday, total_seconds: 600 },
		});
		expect(json.data.languages.map((l: { name: string }) => l.name)).toEqual(['TypeScript', 'CSS']);
	});

	it('rejects an unknown stats range', async () => {
		const { status } = await call(getStats, {
			path: '/api/v1/users/current/stats/last_century',
			params: { range: 'last_century' },
			headers: basicAuth(apiKey),
		});
		expect(status).toBe(400);
	});

	it('serves the status bar endpoint wakatime-cli --today uses', async () => {
		const { status, json } = await call(getStatusBar, {
			path: '/api/v1/users/current/statusbar/today',
			headers: basicAuth(apiKey),
		});
		expect(status).toBe(200);
		expect(json.data.range.text).toBe('Today');
		expect(json.data.grand_total).toHaveProperty('text');
	});

	it('lists projects created from heartbeats, most recent first', async () => {
		const { json } = await call(getProjects, { path: '/api/v1/users/current/projects', headers: basicAuth(apiKey) });
		expect(json.data.map((p: { name: string }) => p.name)).toEqual(['web', 'api']);
	});
});

describe('account endpoints', () => {
	it('returns the current user for an API key', async () => {
		const { json } = await call(getUser, { path: '/api/v1/users/current', headers: basicAuth(apiKey) });
		expect(json.data).toMatchObject({
			id: userId,
			email: 'dev@wakacraft.test',
			timezone: 'UTC',
			timeout: 15,
			last_project: 'web',
		});
	});

	it('keeps API key management behind a browser session', async () => {
		const { status } = await call(getApiKeys, { path: '/api/v1/users/current/api_keys', headers: basicAuth(apiKey) });
		expect(status).toBe(403);
	});

	it("refuses another user's data", async () => {
		const { status } = await call(getSummaries, {
			path: `/api/v1/users/someone-else/summaries?start=${yesterday}&end=${yesterday}`,
			params: { user: 'someone-else' },
			headers: basicAuth(apiKey),
		});
		expect(status).toBe(403);
	});
});
