import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as runCron } from '@/app/api/cron/rollups/route';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { call } from './api';
import { signUpTestUser } from './users';

const TIMEZONE = 'America/Los_Angeles';
const yesterday = addDays(todayIn(TIMEZONE), -1);
let userId: string;

beforeAll(async () => {
	process.env.CRON_SECRET = 'cron-test-secret';
	await connectMongo();
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'cron@wakacraft.test', name: 'Nightly' } }));
	await userProfileService.updateSettings(userId, { timezone: TIMEZONE });
	await heartbeatService.ingest(
		userId,
		Array.from({ length: 11 }, (_, index) => ({
			entity: '/src/cron.ts',
			type: 'file',
			time: localDayBounds(yesterday, TIMEZONE).start + 12 * 3600 + index * 60,
		})),
		{ userAgent: null, machineName: null },
	);
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('rollup cron', () => {
	it('refuses callers without the cron secret', async () => {
		expect((await call(runCron, { path: '/api/cron/rollups' })).status).toBe(401);
		expect(
			(await call(runCron, { path: '/api/cron/rollups', headers: { authorization: 'Bearer wrong' } })).status,
		).toBe(401);
	});

	it("caches each active user's yesterday in their timezone", async () => {
		expect(await mongoDailySummaryService.count({ userId, date: yesterday })).toBe(0);
		const { status, json } = await call(runCron, {
			path: '/api/cron/rollups',
			headers: { authorization: 'Bearer cron-test-secret' },
		});
		expect(status).toBe(200);
		expect(json.data.users).toBeGreaterThanOrEqual(1);
		const [rollup] = await mongoDailySummaryService.find({ userId, date: yesterday });
		expect(rollup).toMatchObject({ timezone: TIMEZONE, totalSeconds: 600 });
	});
});
