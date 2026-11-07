import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectMongo } from '@/lib/mongo/connection';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { dashboardService } from '@/server/dashboard/dashboard.service';
import { importService } from '@/server/import/import.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { signUpTestUser } from './users';

const today = todayIn('UTC');
const yesterday = addDays(today, -1);

let userId: string;

const run = (date: string, minutes: number, language: string) =>
	Array.from({ length: minutes + 1 }, (_, index) => ({
		entity: `/src/main.${language}`,
		type: 'file',
		category: 'coding',
		project: 'api',
		language,
		// Early in the day, so that today's heartbeats are never in the future.
		time: localDayBounds(date, 'UTC').start + index * 2,
	}));

beforeAll(async () => {
	await connectMongo();
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'dashboard-today@wakacraft.test', name: 'Today' } }));
	await userProfileService.updateSettings(userId, { timezone: 'UTC' });
	await importService.importBatch(userId, { heartbeats: [...run(today, 30, 'Rust'), ...run(yesterday, 30, 'Perl')] });
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('dashboard todayLanguages', () => {
	it('covers only today, whatever the selected range includes', async () => {
		const view = await dashboardService.getView(userId, '7d');
		expect(view.languages.map((language) => language.name).sort()).toEqual(['Perl', 'Rust']);
		expect(view.todayLanguages.map((language) => language.name)).toEqual(['Rust']);
		expect(view.todayLanguages[0].percent).toBeCloseTo(100);
	});
});
