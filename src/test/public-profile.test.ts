import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getStats } from '@/app/api/v1/users/[user]/stats/[range]/route';
import { GET as getUser } from '@/app/api/v1/users/[user]/route';
import { auth } from '@/lib/auth/auth';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { basicAuth, call, CLI_USER_AGENT } from './api';

const day = addDays(todayIn('UTC'), -1);

async function makeUser(username: string, settings: Parameters<typeof userProfileService.updateSettings>[1]) {
	const { user } = await auth.api.signUpEmail({
		body: { email: `${username}@wakacraft.test`, password: 'correct-horse-battery', name: username },
	});
	await userProfileService.updateSettings(user.id, { username, timezone: 'UTC', ...settings });
	const heartbeats = ['oss', 'client-secret'].flatMap((project, p) =>
		Array.from({ length: 6 }, (_, index) => ({
			entity: `/src/${project}.rs`,
			type: 'file',
			category: 'coding',
			project,
			language: 'Rust',
			time: localDayBounds(day, 'UTC').start + (9 + p) * 3600 + index * 60,
			user_agent: CLI_USER_AGENT,
		})),
	);
	await heartbeatService.ingest(user.id, heartbeats, { userAgent: null, machineName: 'home-desktop' });
	return user.id;
}

const anonymous = (handler: typeof getStats | typeof getUser, path: string, params: Record<string, string>) =>
	call(handler, { path, params });

let aliceId: string;

beforeAll(async () => {
	await connectMongo();
	aliceId = await makeUser('alice', { loggedTimePublic: true, languagesUsedPublic: true, editorsUsedPublic: false });
	await mongoProjectService.updateMany({ userId: aliceId, name: 'oss' }, { $set: { hasPublicUrl: true } });
	await makeUser('bob', { loggedTimePublic: false });
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('public profiles', () => {
	it('serves only public fields of another user', async () => {
		const { status, json } = await anonymous(getUser, '/api/v1/users/alice', { user: 'alice' });
		expect(status).toBe(200);
		expect(json.data).toMatchObject({ username: 'alice', email: null, logged_time_public: true });
		expect(json.data).not.toHaveProperty('timezone');
		expect(json.data).not.toHaveProperty('last_project');
	});

	it('still serves the full account to its owner', async () => {
		const { key } = await apiKeyService.create(aliceId, 'test');
		const { json } = await call(getUser, {
			path: '/api/v1/users/alice',
			params: { user: 'alice' },
			headers: basicAuth(key),
		});
		expect(json.data).toMatchObject({ email: 'alice@wakacraft.test', timezone: 'UTC' });
	});

	it('shows public stats with private breakdowns, projects and machines removed', async () => {
		const { status, json } = await anonymous(getStats, '/api/v1/users/alice/stats/last_7_days', {
			user: 'alice',
			range: 'last_7_days',
		});
		expect(status).toBe(200);
		expect(json.data.languages.map((language: { name: string }) => language.name)).toEqual(['Rust']);
		expect(json.data.editors).toEqual([]);
		expect(json.data.is_editor_usage_visible).toBe(false);
		expect(json.data.projects.map((project: { name: string }) => project.name)).toEqual(['oss']);
		expect(json.data.machines).toEqual([]);
		expect(json.data.total_seconds_including_other_language).toBeGreaterThan(0);
	});

	it("refuses private users' stats and unknown usernames", async () => {
		expect(
			(await anonymous(getStats, '/api/v1/users/bob/stats/last_7_days', { user: 'bob', range: 'last_7_days' })).status,
		).toBe(403);
		expect((await anonymous(getUser, '/api/v1/users/nobody', { user: 'nobody' })).status).toBe(404);
	});

	it('requires authentication for "current"', async () => {
		expect((await anonymous(getUser, '/api/v1/users/current', { user: 'current' })).status).toBe(401);
	});

	it('does not resolve other users by internal id', async () => {
		expect((await anonymous(getUser, `/api/v1/users/${aliceId}`, { user: aliceId })).status).toBe(404);
	});
});
