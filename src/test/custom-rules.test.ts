import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getProgress } from '@/app/api/v1/users/[user]/custom_rules_progress/route';
import { GET as listRules, PUT as putRules } from '@/app/api/v1/users/[user]/custom_rules/route';
import { POST as postBulk } from '@/app/api/v1/users/[user]/heartbeats.bulk/route';
import { auth } from '@/lib/auth/auth';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { apiKeyService } from '@/server/api-key/api-key.service';

import { basicAuth, call } from './api';

let userId: string;
let apiKey: string;
const now = Math.floor(Date.now() / 1000) - 3600;

const heartbeat = (offset: number, project: string, entity = `/work/${project}/main.ts`) => ({
	entity,
	type: 'file',
	category: 'coding',
	time: now + offset,
	project,
	language: 'TypeScript',
});

const post = (body: unknown[]) =>
	call(postBulk, { path: '/api/v1/users/current/heartbeats.bulk', method: 'POST', body, headers: basicAuth(apiKey) });

async function waitForJob(jobId: string) {
	for (let attempt = 0; attempt < 50; attempt++) {
		const { json } = await call(getProgress, {
			path: `/api/v1/users/current/custom_rules_progress?job_id=${jobId}`,
			headers: basicAuth(apiKey),
		});
		if (json.data.status !== 'running') return json.data;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error('Rule job did not finish');
}

beforeAll(async () => {
	await connectMongo();
	const { user } = await auth.api.signUpEmail({
		body: { email: 'rules@wakacraft.test', password: 'correct-horse-battery', name: 'Rule Maker' },
	});
	userId = user.id;
	({ key: apiKey } = await apiKeyService.create(userId, 'test'));

	await post([
		heartbeat(0, 'acme-old'),
		heartbeat(60, 'acme-old'),
		heartbeat(120, 'side-project', '/work/secret/notes.md'),
		heartbeat(180, 'side-project'),
	]);
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('custom rules', () => {
	it('rejects a change rule without a destination', async () => {
		const { status, json } = await call(putRules, {
			path: '/api/v1/users/current/custom_rules',
			method: 'PUT',
			headers: basicAuth(apiKey),
			body: [{ action: 'change', source: 'project', operation: 'equals', source_value: 'x' }],
		});
		expect(status).toBe(400);
		expect(JSON.stringify(json.errors)).toContain('destination');
	});

	it('replaces the rule set and rewrites history in the background', async () => {
		const { status, json } = await call(putRules, {
			path: '/api/v1/users/current/custom_rules',
			method: 'PUT',
			headers: basicAuth(apiKey),
			body: [
				{
					action: 'change',
					source: 'project',
					operation: 'ends with',
					source_value: '-old',
					destination: 'project',
					destination_value: 'acme',
				},
				{ action: 'delete', source: 'entity', operation: 'contains', source_value: '/SECRET/' },
			],
		});
		expect(status).toBe(200);
		expect(json.data.changes.added).toEqual([1, 2]);

		const job = await waitForJob(json.data.job_id);
		expect(job).toMatchObject({ status: 'done', progress: 100, changed_heartbeats: 2, deleted_heartbeats: 1 });

		const projects = await mongoHeartbeatService.find({ userId }, ['project', 'entity']);
		expect(projects.map((heartbeat) => heartbeat.project).sort()).toEqual(['acme', 'acme', 'side-project']);
		expect(projects.some((heartbeat) => heartbeat.entity.includes('/secret/'))).toBe(false);
	});

	it('rebuilds the project list, dropping projects that no longer have activity', async () => {
		const names = (await mongoProjectService.find({ userId }, ['name'])).map((project) => project.name).sort();
		expect(names).toEqual(['acme', 'side-project']);
	});

	it('applies rules to new heartbeats as they arrive', async () => {
		const { json } = await post([heartbeat(240, 'acme-old'), heartbeat(300, 'side-project', '/work/secret/plan.md')]);
		expect(json.responses.map(([, status]: [unknown, number]) => status)).toEqual([201, 201]);
		// The deleted one is acknowledged (so the plugin stops retrying) but not stored.
		expect(json.responses[1][0].data.id).toBe('');

		const stored = await mongoHeartbeatService.find({ userId, time: { $gte: now + 240 } }, ['project']);
		expect(stored.map((heartbeat) => heartbeat.project)).toEqual(['acme']);
	});

	it('lists rules in WakaTime shape, ordered by priority', async () => {
		const { json } = await call(listRules, { path: '/api/v1/users/current/custom_rules', headers: basicAuth(apiKey) });
		expect(json.data).toHaveLength(2);
		expect(json.data[0]).toMatchObject({
			priority: 1,
			action: 'change',
			source: 'project',
			operation: 'ends with',
			source_value: '-old',
			destinations: [expect.objectContaining({ destination: 'project', destination_value: 'acme' })],
		});
		expect(json.data[1]).toMatchObject({ priority: 2, action: 'delete', destinations: [] });
	});
});
