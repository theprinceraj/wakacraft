import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getInsight } from '@/app/api/v1/users/[user]/insights/[insight_type]/[range]/route';
import { auth } from '@/lib/auth/auth';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { addDays, localDayBounds, todayIn, weekdayOf } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { ROLLUP_VERSION } from '@/server/stats/day-totals';

import { basicAuth, call } from './api';

const today = todayIn('UTC');
const dayA = addDays(today, -1);
const dayB = addDays(today, -2);

let userId: string;
let apiKey: string;

const insight = (type: string, range = 'last_7_days', query = '') =>
	call(getInsight, {
		path: `/api/v1/users/current/insights/${type}/${range}?timezone=UTC${query}`,
		params: { insight_type: type, range },
		headers: basicAuth(apiKey),
	});

beforeAll(async () => {
	await connectMongo();
	const { user } = await auth.api.signUpEmail({
		body: { email: 'insights@wakacraft.test', password: 'correct-horse-battery', name: 'Insightful' },
	});
	userId = user.id;
	({ key: apiKey } = await apiKeyService.create(userId, 'test'));

	// dayA: 09:50–10:10 UTC (20 min, Rust). dayB: 14:00–14:10 UTC (10 min, Go).
	const run = (date: string, hour: number, minute: number, minutes: number, language: string) =>
		Array.from({ length: minutes + 1 }, (_, index) => ({
			entity: `/src/main.${language}`,
			type: 'file',
			category: 'coding',
			language,
			project: 'insights',
			time: localDayBounds(date, 'UTC').start + hour * 3600 + minute * 60 + index * 60,
			ai_line_changes: index === 0 ? 7 : undefined,
		}));
	await heartbeatService.ingest(userId, [...run(dayA, 9, 50, 20, 'Rust'), ...run(dayB, 14, 0, 10, 'Go')], {
		userAgent: null,
		machineName: null,
	});
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('insights', () => {
	it('splits time of day by local hour', async () => {
		const { status, json } = await insight('hours');
		expect(status).toBe(200);
		const hours = json.data.hours as { hour: number; total_seconds: number }[];
		expect(hours).toHaveLength(24);
		expect(hours[9].total_seconds).toBe(600);
		expect(hours[10].total_seconds).toBe(600);
		expect(hours[14].total_seconds).toBe(600);
		expect(hours.reduce((sum, hour) => sum + hour.total_seconds, 0)).toBe(1800);
	});

	it('returns the same answer from cached rollups', async () => {
		expect(await mongoDailySummaryService.count({ userId, date: dayA, version: ROLLUP_VERSION })).toBe(1);
		const { json } = await insight('hours');
		expect(json.data.hours[9].total_seconds).toBe(600);
	});

	it('rebuilds rollups written by another version instead of trusting them', async () => {
		// Simulate a rollup cached by older code: right totals, but no per-hour data.
		await mongoDailySummaryService.updateMany(
			{ userId, date: dayA },
			{ $set: { hours: Array(24).fill(0), version: 1 } },
		);
		const { json } = await insight('hours');
		expect(json.data.hours[9].total_seconds).toBe(600);
		expect(await mongoDailySummaryService.count({ userId, date: dayA, version: ROLLUP_VERSION })).toBe(1);
	});

	it('averages weekdays over every occurrence in the range', async () => {
		const { json } = await insight('weekdays');
		const weekday = (
			json.data.weekdays as { weekday: number; days: number; total_seconds: number; average_seconds: number }[]
		).find((day) => day.weekday === weekdayOf(dayA))!;
		expect(weekday).toMatchObject({ days: 1, total_seconds: 1200, average_seconds: 1200 });
		expect(json.data.weekdays).toHaveLength(7);
		expect(json.data.human_readable_range).toBe('Last 7 Days');
	});

	it('lists days, optionally for one weekday', async () => {
		const all = await insight('days');
		expect(all.json.data.days).toHaveLength(7);
		const one = await insight('days', 'last_7_days', `&weekday=${weekdayOf(dayB)}`);
		expect(one.json.data.days).toEqual([{ date: dayB, total_seconds: 600, text: '10 mins' }]);
	});

	it('finds the best day and the daily average', async () => {
		expect((await insight('best_day')).json.data.best_day).toEqual({
			date: dayA,
			total_seconds: 1200,
			text: '20 mins',
		});
		expect((await insight('daily_average')).json.data.daily_average).toMatchObject({
			days_including_holidays: 7,
			days_minus_holidays: 2,
			seconds: 900,
		});
	});

	it('breaks down languages and AI days', async () => {
		const languages = (await insight('languages')).json.data.languages as { name: string; total_seconds: number }[];
		expect(languages.map((language) => [language.name, language.total_seconds])).toEqual([
			['Rust', 1200],
			['Go', 600],
		]);
		const aiDays = (await insight('ai_days')).json.data.ai_days as { date: string; ai_line_changes: number }[];
		expect(aiDays.find((day) => day.date === dayA)?.ai_line_changes).toBe(7);
	});

	it('rejects unknown insight types', async () => {
		expect((await insight('vibes')).status).toBe(400);
	});
});
