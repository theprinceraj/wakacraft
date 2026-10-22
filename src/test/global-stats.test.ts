import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getGlobalStats } from '@/app/api/v1/stats/[range]/route';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoGlobalStatsService } from '@/lib/mongo/global-stats/global-stats.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { call } from './api';
import { signUpTestUser } from './users';

const day = addDays(todayIn('UTC'), -1);

async function makeUser(name: string, language: string, minutes: number, settings: Record<string, unknown>) {
	const { user } = await signUpTestUser({ body: { email: `${name}@global.wakacraft.test`, name } });
	await userProfileService.updateSettings(user.id, { timezone: 'UTC', ...settings });
	await heartbeatService.ingest(
		user.id,
		Array.from({ length: minutes + 1 }, (_, index) => ({
			entity: `/src/main.${language}`,
			type: 'file',
			language,
			time: localDayBounds(day, 'UTC').start + 11 * 3600 + index * 60,
		})),
		{ userAgent: null, machineName: null },
	);
}

type Item = { name: string; total_seconds: number; users_count: number };

beforeAll(async () => {
	await connectMongo();
	await mongoGlobalStatsService.deleteMany({});
	await makeUser('gs-one', 'GlobalLang', 20, { loggedTimePublic: true, languagesUsedPublic: true });
	await makeUser('gs-two', 'GlobalLang', 10, { loggedTimePublic: true, languagesUsedPublic: true });
	// Public time but private languages: counts in the total, not in the language breakdown.
	await makeUser('gs-three', 'SecretLang', 30, { loggedTimePublic: true, languagesUsedPublic: false });
	// Entirely private: not counted at all.
	await makeUser('gs-four', 'HiddenLang', 40, { loggedTimePublic: false });
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('global stats', () => {
	it('aggregates public users, honouring each breakdown flag', async () => {
		const { status, json } = await call(getGlobalStats, {
			path: '/api/v1/stats/last_7_days',
			params: { range: 'last_7_days' },
		});
		expect(status).toBe(200);
		const names = json.data.languages.map((item: Item) => item.name);
		expect(names).not.toContain('SecretLang');
		expect(names).not.toContain('HiddenLang');
		expect(json.data.languages.find((item: Item) => item.name === 'GlobalLang')).toMatchObject({
			total_seconds: 1800,
			users_count: 2,
		});
		expect(json.data.total_seconds).toBeGreaterThanOrEqual(3600);
	});

	it('rejects unknown ranges', async () => {
		const { status } = await call(getGlobalStats, { path: '/api/v1/stats/all_time', params: { range: 'all_time' } });
		expect(status).toBe(400);
	});
});
