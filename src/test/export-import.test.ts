import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as downloadDump } from '@/app/api/v1/users/[user]/data_dumps/[id]/download/route';
import { GET as listDumps, POST as createDump } from '@/app/api/v1/users/[user]/data_dumps/route';
import { POST as postBulk } from '@/app/api/v1/users/[user]/heartbeats.bulk/route';
import { connectMongo } from '@/lib/mongo/connection';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { importService } from '@/server/import/import.service';
import { statsService } from '@/server/stats/stats.service';

import { basicAuth, call, CLI_USER_AGENT } from './api';
import { signUpTestUser } from './users';

const recentDay = addDays(todayIn('UTC'), -2);
const oldDay = addDays(todayIn('UTC'), -500);

let source: { id: string; key: string };
let target: { id: string };

const signUp = async (email: string) => {
	const { user } = await signUpTestUser({ body: { email, password: 'correct-horse-battery', name: email } });
	return user.id;
};

const run = (date: string, project: string, minutes: number) =>
	Array.from({ length: minutes + 1 }, (_, index) => ({
		entity: `/src/${project}.ts`,
		type: 'file',
		category: 'coding',
		project,
		language: 'TypeScript',
		time: localDayBounds(date, 'UTC').start + 10 * 3600 + index * 60,
		user_agent: CLI_USER_AGENT,
	}));

async function readDump(type: 'heartbeats' | 'daily') {
	const created = await call(createDump, {
		path: '/api/v1/users/current/data_dumps',
		method: 'POST',
		body: { type },
		headers: basicAuth(source.key),
	});
	const response = await downloadDump(
		new (await import('next/server')).NextRequest(
			`http://localhost:3000/api/v1/users/current/data_dumps/${created.json.data.id}/download`,
			{
				headers: basicAuth(source.key),
			},
		),
		{ params: Promise.resolve({ user: 'current', id: created.json.data.id }) },
	);
	return { created: created.json.data, response, json: JSON.parse(await response.text()) };
}

beforeAll(async () => {
	await connectMongo();
	const sourceId = await signUp('exporter@wakacraft.test');
	source = { id: sourceId, key: (await apiKeyService.create(sourceId, 'test')).key };
	target = { id: await signUp('importer@wakacraft.test') };

	await heartbeatService.ingest(source.id, run(recentDay, 'api', 10), { userAgent: null, machineName: 'laptop' });
	// Old history can only arrive through import, never through live ingestion.
	await importService.importBatch(source.id, { heartbeats: run(oldDay, 'legacy', 5) });
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('data dumps', () => {
	it('creates a dump that is complete immediately and lists it', async () => {
		const { created } = await readDump('heartbeats');
		expect(created).toMatchObject({ type: 'heartbeats', status: 'Completed', percent_complete: 100 });
		expect(created.download_url).toContain(`/data_dumps/${created.id}/download`);

		const { json } = await call(listDumps, {
			path: '/api/v1/users/current/data_dumps',
			headers: basicAuth(source.key),
		});
		expect(json.data.length).toBeGreaterThanOrEqual(1);
	});

	it('streams a heartbeats export grouped by day, with user agents and machines', async () => {
		const { response, json } = await readDump('heartbeats');
		expect(response.headers.get('content-disposition')).toMatch(/attachment; filename="wakacraft-heartbeats-/);
		expect(json.days.map((day: { date: string }) => day.date)).toEqual([oldDay, recentDay]);
		expect(json.days[1].heartbeats).toHaveLength(11);
		expect(json.user_agents[0].value).toBe(CLI_USER_AGENT);
		expect(json.machines.map((machine: { name: string }) => machine.name)).toEqual(['laptop']);
	});

	it('streams a daily export with one summary per day', async () => {
		const { json } = await readDump('daily');
		const recent = json.days.find((day: { range: { date: string } }) => day.range.date === recentDay);
		expect(recent.grand_total.total_seconds).toBe(600);
		expect(json.days.length).toBeGreaterThan(400);
	});
});

describe('import', () => {
	it('rejects old heartbeats on the live endpoint', async () => {
		const { json } = await call(postBulk, {
			path: '/api/v1/users/current/heartbeats.bulk',
			method: 'POST',
			body: run(oldDay, 'legacy', 0),
			headers: basicAuth(source.key),
		});
		expect(json.responses[0][1]).toBe(400);
	});

	it('round-trips an export into another account with identical stats', async () => {
		const { json } = await readDump('heartbeats');
		const heartbeats = json.days.flatMap((day: { heartbeats: unknown[] }) => day.heartbeats);
		const result = await importService.importBatch(target.id, {
			heartbeats,
			user_agents: json.user_agents,
			machines: json.machines,
		});
		expect(result.data).toMatchObject({ received: 17, accepted: 17, invalid: 0 });

		for (const date of [recentDay, oldDay]) {
			const query = { start: date, end: date, timezone: 'UTC' };
			const [a, b] = await Promise.all([
				statsService.getSummaries(source.id, query),
				statsService.getSummaries(target.id, query),
			]);
			expect(b.data[0].grand_total.total_seconds).toBe(a.data[0].grand_total.total_seconds);
			expect(b.data[0].projects).toEqual(a.data[0].projects);
		}
		const imported = await statsService.getSummaries(target.id, { start: recentDay, end: recentDay, timezone: 'UTC' });
		expect(imported.data[0].editors[0].name).toBe('VS Code');
		expect(imported.data[0].machines[0].name).toBe('laptop');
	});

	it('is safe to re-run: the same batch adds nothing', async () => {
		const before = await statsService.getSummaries(target.id, { start: recentDay, end: recentDay, timezone: 'UTC' });
		const { json } = await readDump('heartbeats');
		await importService.importBatch(target.id, {
			heartbeats: json.days.flatMap((day: { heartbeats: unknown[] }) => day.heartbeats),
			user_agents: json.user_agents,
			machines: json.machines,
		});
		const after = await statsService.getSummaries(target.id, { start: recentDay, end: recentDay, timezone: 'UTC' });
		expect(after.data[0].grand_total.total_seconds).toBe(before.data[0].grand_total.total_seconds);
	});
});
