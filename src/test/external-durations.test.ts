import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DELETE as deleteBulk, POST as postBulk } from '@/app/api/v1/users/[user]/external_durations.bulk/route';
import { GET as listExternal } from '@/app/api/v1/users/[user]/external_durations/route';
import { connectMongo } from '@/lib/mongo/connection';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { externalToHeartbeats } from '@/server/stats/activity-stream';
import { computeTotals } from '@/server/stats/engine';
import { statsService } from '@/server/stats/stats.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { basicAuth, call } from './api';
import { signUpTestUser } from './users';

const day = addDays(todayIn('UTC'), -1);
const dayStart = localDayBounds(day, 'UTC').start;
const at = (hour: number, minute = 0) => dayStart + hour * 3600 + minute * 60;

let userId: string;
let apiKey: string;

const meeting = (overrides: Record<string, unknown> = {}) => ({
	external_id: 'cal-123',
	entity: 'Sprint planning',
	type: 'app',
	category: 'meeting',
	start_time: at(10),
	end_time: at(10, 30),
	project: 'api',
	provider: 'Google Calendar',
	...overrides,
});

const post = (body: unknown[]) =>
	call(postBulk, {
		path: '/api/v1/users/current/external_durations.bulk',
		method: 'POST',
		body,
		headers: basicAuth(apiKey),
	});
const dayTotal = async () =>
	(await statsService.getSummaries(userId, { start: day, end: day, timezone: 'UTC' })).data[0];

beforeAll(async () => {
	await connectMongo();
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'external@wakacraft.test', name: 'Meeter' } }));
	await userProfileService.updateSettings(userId, { timezone: 'UTC' });
	({ key: apiKey } = await apiKeyService.create(userId, 'test'));
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('externalToHeartbeats', () => {
	it('is credited exactly its length, clipped to the range', () => {
		const external = {
			startTime: 1000,
			endTime: 1000 + 1845,
			entity: 'x',
			category: 'meeting' as const,
			project: null,
			branch: null,
			language: null,
			provider: null,
		};
		const full = externalToHeartbeats(external, 0, 10_000);
		expect(computeTotals(full, { timeoutSeconds: 900, rangeEnd: 10_000 }).totalSeconds).toBe(1845);
		const clipped = externalToHeartbeats(external, 0, 2000);
		expect(computeTotals(clipped, { timeoutSeconds: 900, rangeEnd: 2000 }).totalSeconds).toBe(1000);
	});
});

describe('external durations API', () => {
	it('adds meeting time to the day, by category and project', async () => {
		const { status, json } = await post([meeting(), meeting({ external_id: 'bad', end_time: at(9) })]);
		expect(status).toBe(201);
		expect(json.status_codes).toEqual([201, 400]);

		const summary = await dayTotal();
		expect(summary.grand_total.total_seconds).toBe(1800);
		expect(summary.categories[0]).toMatchObject({ name: 'meeting', total_seconds: 1800 });
		expect(summary.projects[0]).toMatchObject({ name: 'api' });
	});

	it('counts time overlapping editor activity once', async () => {
		// 10 minutes of coding in the middle of the meeting.
		await heartbeatService.ingest(
			userId,
			Array.from({ length: 11 }, (_, index) => ({ entity: '/a.ts', type: 'file', time: at(10, 10) + index * 60 })),
			{ userAgent: null, machineName: null },
		);
		expect((await dayTotal()).grand_total.total_seconds).toBe(1800);
	});

	it('updates in place when the same external_id is re-sent, refreshing cached totals', async () => {
		await post([meeting({ end_time: at(11) })]);
		expect((await dayTotal()).grand_total.total_seconds).toBe(3600);
		const { json } = await call(listExternal, {
			path: `/api/v1/users/current/external_durations?date=${day}`,
			headers: basicAuth(apiKey),
		});
		expect(json.data).toHaveLength(1);
		expect(json.data[0]).toMatchObject({ external_id: 'cal-123', provider: 'Google Calendar' });
	});

	it('deletes by id for a date', async () => {
		const { json } = await call(listExternal, {
			path: `/api/v1/users/current/external_durations?date=${day}`,
			headers: basicAuth(apiKey),
		});
		const removed = await call(deleteBulk, {
			path: '/api/v1/users/current/external_durations.bulk',
			method: 'DELETE',
			body: { date: day, ids: [json.data[0].id] },
			headers: basicAuth(apiKey),
		});
		expect(removed.status).toBe(200);
		// Only the 10 minutes of editor activity remain.
		expect((await dayTotal()).grand_total.total_seconds).toBe(600);
	});
});
