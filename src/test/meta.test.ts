import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getEditors } from '@/app/api/v1/editors/route';
import { GET as getMeta } from '@/app/api/v1/meta/route';
import { GET as getLanguages } from '@/app/api/v1/program_languages/route';
import { POST as postFileExperts } from '@/app/api/v1/users/[user]/file_experts/route';
import { connectMongo } from '@/lib/mongo/connection';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { orgService } from '@/server/org/org.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { basicAuth, call } from './api';
import { signUpTestUser } from './users';

const day = addDays(todayIn('UTC'), -1);
const ids: Record<string, string> = {};
let apiKey: string;

async function makeUser(name: string, minutesOnFile: number) {
	const { user } = await signUpTestUser({ body: { email: `${name}@meta.wakacraft.test`, name } });
	await userProfileService.updateSettings(user.id, { timezone: 'UTC', username: name });
	await heartbeatService.ingest(
		user.id,
		Array.from({ length: minutesOnFile + 1 }, (_, index) => ({
			entity: '/repo/src/core.ts',
			type: 'file',
			project: 'shared',
			time: localDayBounds(day, 'UTC').start + 8 * 3600 + index * 60,
		})),
		{ userAgent: null, machineName: null },
	);
	ids[name] = user.id;
}

beforeAll(async () => {
	await connectMongo();
	await makeUser('meta-lead', 30);
	await makeUser('meta-dev', 45);
	await makeUser('meta-stranger', 90);
	const { data: org } = await orgService.createOrg(ids['meta-lead'], 'Meta team');
	await orgService.joinOrg(ids['meta-dev'], org.invite_code!);
	({ key: apiKey } = await apiKeyService.create(ids['meta-lead'], 'meta test'));
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('catalog endpoints', () => {
	it('serves meta, editors and languages without auth', async () => {
		expect((await call(getMeta, { path: '/api/v1/meta' })).json.data.ips).toEqual({ api: [], website: [], worker: [] });

		const editors = (await call(getEditors, { path: '/api/v1/editors' })).json;
		expect(editors.data.map((editor: { name: string }) => editor.name)).toContain('VS Code');
		expect(new Set(editors.data.map((editor: { id: string }) => editor.id)).size).toBe(editors.total);

		const languages = (await call(getLanguages, { path: '/api/v1/program_languages' })).json;
		expect(languages.data).toContainEqual({ id: 'csharp', name: 'C#', color: '#178600', is_verified: true });
		expect(new Set(languages.data.map((language: { id: string }) => language.id)).size).toBe(languages.total);
	});
});

describe('file experts', () => {
	it('ranks you and your teammates on a file, never strangers', async () => {
		const { status, json } = await call(postFileExperts, {
			path: '/api/v1/users/current/file_experts',
			method: 'POST',
			body: { entity: '/repo/src/core.ts', project: 'shared', project_root_count: 2 },
			headers: basicAuth(apiKey),
		});
		expect(status).toBe(200);
		expect(
			json.data.map((entry: { user: { name: string; is_current_user: boolean }; total: { total_seconds: number } }) => [
				entry.user.name,
				entry.user.is_current_user,
				entry.total.total_seconds,
			]),
		).toEqual([
			['meta-dev', false, 45 * 60],
			['meta-lead', true, 30 * 60],
		]);
	});

	it('returns nothing for a file nobody worked on', async () => {
		const { json } = await call(postFileExperts, {
			path: '/api/v1/users/current/file_experts',
			method: 'POST',
			body: { entity: '/repo/README.md', project: 'shared' },
			headers: basicAuth(apiKey),
		});
		expect(json.data).toEqual([]);
	});
});
