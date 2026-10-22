import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectMongo } from '@/lib/mongo/connection';
import { localDayBounds, todayIn } from '@/lib/util/Time';
import { importService } from '@/server/import/import.service';
import { userProfileService } from '@/server/user/user-profile.service';
import { wrappedService } from '@/server/wrapped/wrapped.service';

import { signUpTestUser } from './users';

const year = Number(todayIn('UTC').slice(0, 4));
// Two consecutive days early in this year and one last year; fixed dates keep the assertions stable.
const days = [`${year}-01-05`, `${year}-01-06`];
const lastYearDay = `${year - 1}-06-10`;

let userId: string;

const run = (date: string, minutes: number, language: string) =>
	Array.from({ length: minutes + 1 }, (_, index) => ({
		entity: `/src/main.${language}`,
		type: 'file',
		category: 'coding',
		project: language === 'Perl' ? 'legacy' : 'api',
		language,
		time: localDayBounds(date, 'UTC').start + 14 * 3600 + index * 60,
	}));

beforeAll(async () => {
	await connectMongo();
	({ user: { id: userId } } = await signUpTestUser({ body: { email: 'wrapped@wakacraft.test', name: 'Wrapper' } }));
	await userProfileService.updateSettings(userId, { timezone: 'UTC' });
	await importService.importBatch(userId, {
		heartbeats: [...run(days[0], 30, 'Rust'), ...run(days[1], 60, 'Rust'), ...run(lastYearDay, 20, 'Perl')],
	});
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('wrapped', () => {
	it('summarizes the year', async () => {
		const view = await wrappedService.getView(userId, year);
		expect(view.totalSeconds).toBe(5400);
		expect(view.activeDays).toBe(2);
		expect(view.longestStreak).toBe(2);
		expect(view.bestDay).toMatchObject({ date: days[1], total_seconds: 3600 });
		expect(view.busiestMonth).toMatchObject({ name: 'January', seconds: 5400 });
		expect(view.peakHour).toBe(14);
		expect(view.languages.map((language) => language.name)).toEqual(['Rust']);
	});

	it('compares with the previous year and finds new languages', async () => {
		const view = await wrappedService.getView(userId, year);
		expect(view.previousYearSeconds).toBe(1200);
		expect(view.newLanguages).toEqual(['Rust']);
		expect(view.years).toEqual([year, year - 1]);
	});
});
