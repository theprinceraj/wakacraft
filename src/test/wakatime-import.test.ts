import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { connectMongo } from '@/lib/mongo/connection';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoWakatimeImportService } from '@/lib/mongo/wakatime-import/wakatime-import.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { importService } from '@/server/import/import.service';
import { statsService } from '@/server/stats/stats.service';
import { wakatimeImportService } from '@/server/wakatime-import/wakatime-import.service';

import { CLI_USER_AGENT } from './api';
import { signUpTestUser } from './users';

import type { IWakatimeImportZodSchema } from '@/lib/mongo/zod';

const GOOD_TOKEN = 'waat_0000000000000000000000000000000000000001';
const MACHINE_ID = '7fdd436f-ff0a-45fd-99d3-cdeb0304d4a7';
const days = [-6, -5, -4].map((offset) => addDays(todayIn('UTC'), offset));
let userId: string;
let rateLimitedOnce = false;
/** Makes every heartbeats request rate limited, so a job stays running. */
let alwaysLimited = false;
const requested: string[] = [];

const heartbeatsFor = (date: string, count: number) =>
	Array.from({ length: count }, (_, index) => ({
		// WakaTime ids are UUIDs; this one is unique per date and index.
		id: `00000000-0000-4000-8000-${date.replaceAll('-', '')}${String(index).padStart(4, '0')}`,
		entity: '/home/me/app/src/index.ts',
		type: 'file',
		category: 'coding',
		project: 'imported-app',
		language: 'TypeScript',
		is_write: false,
		time: localDayBounds(date, 'UTC').start + 10 * 3600 + index * 60,
		user_agent_id: 'ua-1',
		machine_name_id: MACHINE_ID,
	}));

function fakeWakatime(input: string | URL | Request, init?: RequestInit) {
	const url = new URL(String(input));
	requested.push(url.pathname + url.search);
	const auth = new Headers(init?.headers).get('authorization');
	const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
		Promise.resolve(new Response(JSON.stringify(body), { status, headers }));
	if (auth !== `Bearer ${GOOD_TOKEN}`) return json({ error: 'Unauthorized' }, 401);

	switch (url.pathname) {
		case '/api/v1/users/current/all_time_since_today':
			return json({ data: { range: { start_date: days[0], end_date: days[2] } } });
		case '/api/v1/users/current/user_agents':
			return json({ data: [{ id: 'ua-1', value: CLI_USER_AGENT }] });
		case '/api/v1/users/current/machine_names':
			return json({ data: [{ id: MACHINE_ID, name: 'workstation', value: 'workstation' }], total_pages: 1 });
		case '/api/v1/users/current/heartbeats': {
			const date = url.searchParams.get('date')!;
			if (alwaysLimited || (date === days[1] && !rateLimitedOnce)) {
				rateLimitedOnce = true;
				return json({ error: 'Too many requests' }, 429, { 'retry-after': '30' });
			}
			return json({
				data: date === days[0] ? heartbeatsFor(date, 11) : date === days[1] ? heartbeatsFor(date, 6) : [],
			});
		}
		default:
			return json({ error: 'Not found' }, 404);
	}
}

const latest = async (user = userId) => (await wakatimeImportService.getStatus(user)).data!;
/** Jobs with their select:false `token` included. */
const jobsWithToken = async (filter: Record<string, unknown>) =>
	(await mongoWakatimeImportService.find(filter, '+token', { sort: { createdAt: -1 } })) as IWakatimeImportZodSchema[];

beforeAll(async () => {
	await connectMongo();
	vi.stubGlobal('fetch', vi.fn(fakeWakatime));
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'wakatime-import@wakacraft.test', name: 'Importer' } }));
});

afterAll(async () => {
	vi.unstubAllGlobals();
	await (await connectMongo()).disconnect();
});

describe('import from wakatime.com', () => {
	it('refuses a token WakaTime rejects', async () => {
		await expect(wakatimeImportService.start(userId, 'waat_not-a-real-token-at-all-000')).rejects.toThrow(
			/rejected that token/,
		);
	});

	it('turns away a secret API key without asking WakaTime', async () => {
		const before = requested.length;
		await expect(wakatimeImportService.start(userId, 'waka_00000000-0000-4000-8000-000000000001')).rejects.toThrow(
			/personal OAuth token/,
		);
		expect(requested).toHaveLength(before);
	});

	it('imports day by day and waits out a rate limit', async () => {
		const { data } = await wakatimeImportService.start(userId, GOOD_TOKEN);
		expect(data).toMatchObject({ status: 'running', start_date: days[0], days_total: 3 });
		await expect(wakatimeImportService.start(userId, GOOD_TOKEN)).rejects.toThrow(/already running/);

		// The first run gets day one, then WakaTime rate limits day two.
		await vi.waitFor(async () => expect((await latest()).waiting_until).not.toBeNull());
		expect(await latest()).toMatchObject({ status: 'running', days_done: 1, cursor: days[1], heartbeats_imported: 11 });

		// Once the wait is over, the next poll resumes from the same day and finishes.
		await mongoWakatimeImportService.updateOne({ userId, status: 'running' }, { $set: { retryAt: new Date(0) } });
		await vi.waitFor(async () => expect((await latest()).status).toBe('done'));
		expect(await latest()).toMatchObject({ days_done: 3, heartbeats_imported: 17, percent: 100 });
		expect(requested.filter((path) => path.includes(`date=${days[1]}`))).toHaveLength(2);
	});

	it('keeps the editor and machine, and forgets the token when done', async () => {
		const [heartbeat] = await mongoHeartbeatService.find({ userId, project: 'imported-app' }, '', { limit: 1 });
		expect(heartbeat).toMatchObject({ editor: 'VS Code', machine: 'workstation' });
		const [job] = await jobsWithToken({ userId });
		expect(job.token).toBeUndefined();
	});

	it('stores the token encrypted and can be cancelled', async () => {
		alwaysLimited = true;
		await wakatimeImportService.start(userId, GOOD_TOKEN);
		await vi.waitFor(async () => expect((await latest()).waiting_until).not.toBeNull());
		const [job] = await jobsWithToken({ userId, status: 'running' });
		expect(job.token).toBeTruthy();
		expect(job.token).not.toContain(GOOD_TOKEN);

		expect((await wakatimeImportService.cancel(userId)).data.status).toBe('cancelled');
		const [cancelled] = await jobsWithToken({ id: job.id });
		expect(cancelled.token).toBeUndefined();
		await expect(wakatimeImportService.cancel(userId)).rejects.toThrow(/No import/);
		alwaysLimited = false;
	});

	it('re-importing the same history adds nothing', async () => {
		await wakatimeImportService.start(userId, GOOD_TOKEN);
		await vi.waitFor(async () => expect((await latest()).status).toBe('done'));
		expect(await mongoHeartbeatService.count({ userId })).toBe(17);
	});
});

describe('export file and API import together', () => {
	let fileUserId: string;

	beforeAll(async () => {
		({
			user: { id: fileUserId },
		} = await signUpTestUser({ body: { email: 'file-then-api@wakacraft.test', name: 'Both' } }));
	});

	it('an API import after a file import of the same history adds nothing', async () => {
		// A WakaTime export file has no user agent or machine lists, so these heartbeats arrive without either.
		await importService.importBatch(fileUserId, {
			heartbeats: [...heartbeatsFor(days[0], 11), ...heartbeatsFor(days[1], 6)],
		});
		expect(await mongoHeartbeatService.count({ userId: fileUserId })).toBe(17);
		const [fromFile] = await mongoHeartbeatService.find({ userId: fileUserId }, '', { limit: 1 });
		expect(fromFile.editor).toBeUndefined();
		expect(fromFile.machine).toBeUndefined();
		// Caches the day's rollup without an editor, which the API import must invalidate.
		await statsService.getSummaries(fileUserId, { start: days[0], end: days[0], timezone: 'UTC' });

		await wakatimeImportService.start(fileUserId, GOOD_TOKEN);
		await vi.waitFor(async () => expect((await latest(fileUserId)).status).toBe('done'));
		expect(await mongoHeartbeatService.count({ userId: fileUserId })).toBe(17);
	});

	it('fills in the editor and machine the file could not resolve, and refreshes cached totals', async () => {
		const unfilled = await mongoHeartbeatService.count({ userId: fileUserId, editor: { $exists: false } });
		expect(unfilled).toBe(0);
		const heartbeats = await mongoHeartbeatService.find({ userId: fileUserId });
		expect(heartbeats.every((heartbeat) => heartbeat.machine === 'workstation')).toBe(true);

		const { data } = await statsService.getSummaries(fileUserId, { start: days[0], end: days[0], timezone: 'UTC' });
		expect(data[0].editors.map((editor: { name: string }) => editor.name)).toEqual(['VS Code']);
		expect(data[0].machines.map((machine: { name: string }) => machine.name)).toEqual(['workstation']);
	});
});
