import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { connectMongo } from '@/lib/mongo/connection';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoRollupInvalidationService } from '@/lib/mongo/rollup-invalidation/rollup-invalidation.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { loadDayTotals } from '@/server/stats/day-totals';
import { userProfileService } from '@/server/user/user-profile.service';

import { signUpTestUser } from './users';

const day = addDays(todayIn('UTC'), -2);
const settings = { timezone: 'UTC', timeoutMinutes: 15, writesOnly: false };
let userId: string;

const minutes = (from: number, count: number) =>
	Array.from({ length: count + 1 }, (_, index) => ({
		entity: '/src/race.ts',
		type: 'file',
		project: 'race',
		time: localDayBounds(day, 'UTC').start + 9 * 3600 + (from + index) * 60,
	}));

beforeAll(async () => {
	await connectMongo();
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'race@wakacraft.test', name: 'Racer' } }));
	await userProfileService.updateSettings(userId, { timezone: 'UTC' });
	await heartbeatService.ingest(userId, minutes(0, 10), { userAgent: null, machineName: null });
});

afterAll(async () => {
	vi.restoreAllMocks();
	await (await connectMongo()).disconnect();
});

describe('rollup write race', () => {
	it('bumps a generation per invalidated date', async () => {
		const before = (await mongoRollupInvalidationService.generations(userId, [day])).get(day) ?? 0;
		expect(before).toBeGreaterThan(0);
		await mongoRollupInvalidationService.bump(userId, [day]);
		expect((await mongoRollupInvalidationService.generations(userId, [day])).get(day)).toBe(before + 1);
	});

	it('drops a rollup when activity for its day arrives mid-computation', async () => {
		const real = mongoRollupInvalidationService.generations.bind(mongoRollupInvalidationService);
		let calls = 0;
		vi.spyOn(mongoRollupInvalidationService, 'generations').mockImplementation(async (...args) => {
			const generations = await real(...args);
			// Right after the computation reads its "before" generations, a late heartbeat for the day lands.
			if (++calls === 1) await heartbeatService.ingest(userId, minutes(60, 20), { userAgent: null, machineName: null });
			return generations;
		});

		await loadDayTotals(userId, [day], settings);
		vi.restoreAllMocks();
		expect(await mongoDailySummaryService.count({ userId, date: day })).toBe(0);

		// Undisturbed, the next read caches the full day.
		const totals = await loadDayTotals(userId, [day], settings);
		expect(totals.get(day)!.totalSeconds).toBe(30 * 60);
		expect(await mongoDailySummaryService.count({ userId, date: day })).toBe(1);
	});
});
