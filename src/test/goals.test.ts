import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getGoal } from '@/app/api/v1/users/[user]/goals/[goal]/route';
import { GET as listGoals } from '@/app/api/v1/users/[user]/goals/route';
import { auth } from '@/lib/auth/auth';
import { connectMongo } from '@/lib/mongo/connection';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { CreateGoalSchema } from '@/server/goal/goal.request.dto';
import { goalService } from '@/server/goal/goal.service';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';

import { basicAuth, call } from './api';

const yesterday = addDays(todayIn('UTC'), -1);
const t0 = localDayBounds(yesterday, 'UTC').start + 9 * 3600;

let userId: string;
let apiKey: string;

beforeAll(async () => {
	await connectMongo();
	const { user } = await auth.api.signUpEmail({
		body: { email: 'goals@wakacraft.test', password: 'correct-horse-battery', name: 'Goal Setter' },
	});
	userId = user.id;
	({ key: apiKey } = await apiKeyService.create(userId, 'test'));

	// Yesterday: 10 minutes of TypeScript on api, then 5 minutes of CSS on web.
	const heartbeats = [
		...Array.from({ length: 11 }, (_, i) => ({ time: t0 + i * 60, project: 'api', language: 'TypeScript' })),
		...Array.from({ length: 6 }, (_, i) => ({ time: t0 + 600 + 60 + i * 60, project: 'web', language: 'CSS' })),
	].map((heartbeat) => ({ entity: `/src/${heartbeat.language}`, type: 'file', category: 'coding', ...heartbeat }));
	await heartbeatService.ingest(userId, heartbeats, { userAgent: null, machineName: null });
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('goals', () => {
	it('evaluates an unfiltered daily goal against yesterday', async () => {
		const goal = await goalService.create(userId, CreateGoalSchema.parse({ delta: 'day', seconds: 15 * 60 }));
		const yesterdayPeriod = goal.chart_data.find((period) => period.range.start === yesterday)!;

		expect(goal.title).toBe('Code at least 15 mins per day');
		// 10 min api + 1 min gap credited to api's last heartbeat + 5 min web = 16 min.
		expect(yesterdayPeriod).toMatchObject({ actual_seconds: 960, range_status: 'success' });
		expect(goal.chart_data).toHaveLength(14);
		expect(goal.status).toBe('pending');
	});

	it('counts only matching activity for a filtered goal', async () => {
		const goal = await goalService.create(
			userId,
			CreateGoalSchema.parse({ delta: 'day', seconds: 10 * 60, languages: ['CSS'] }),
		);
		const yesterdayPeriod = goal.chart_data.find((period) => period.range.start === yesterday)!;

		expect(goal.title).toBe('Code at least 10 mins per day in CSS');
		expect(yesterdayPeriod).toMatchObject({
			actual_seconds: 300,
			range_status: 'fail',
			range_status_reason: 'Short by 5 mins',
		});
	});

	it('rejects a daily goal longer than a day', () => {
		expect(CreateGoalSchema.safeParse({ delta: 'day', seconds: 25 * 3600 }).success).toBe(false);
		expect(CreateGoalSchema.safeParse({ delta: 'week', seconds: 25 * 3600 }).success).toBe(true);
	});

	it('updates and clears a custom title', async () => {
		const [goal] = await goalService.list(userId);
		expect((await goalService.update(userId, goal.id, { title: 'Ship it' })).title).toBe('Ship it');
		expect((await goalService.update(userId, goal.id, { title: null })).title).toBe('Code at least 15 mins per day');
	});

	it('serves goals over the WakaTime API with an API key', async () => {
		const list = await call(listGoals, { path: '/api/v1/users/current/goals', headers: basicAuth(apiKey) });
		expect(list.status).toBe(200);
		expect(list.json.total).toBe(2);

		const one = await call(getGoal, {
			path: `/api/v1/users/current/goals/${list.json.data[0].id}`,
			params: { goal: list.json.data[0].id },
			headers: basicAuth(apiKey),
		});
		expect(one.json.data).toMatchObject({ id: list.json.data[0].id, delta: 'day', type: 'coding' });
	});
});
