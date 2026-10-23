import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signUpTestUser } from './users';

import { GET as getBadge } from '@/app/api/v1/users/[user]/badges/projects/[project]/route';
import { GET as getShare } from '@/app/share/[username]/[chart]/route';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { userProfileService } from '@/server/user/user-profile.service';

const day = addDays(todayIn('UTC'), -1);

/** Raw invocation: these endpoints return SVG, not JSON. */
async function fetchRoute(handler: typeof getBadge, path: string, params: Record<string, string>) {
	const response = await handler(new NextRequest(new URL(path, 'http://localhost:3000')), {
		params: Promise.resolve(params),
	});
	return { status: response.status, type: response.headers.get('content-type') ?? '', body: await response.text() };
}

async function makeUser(username: string, settings: Record<string, unknown>) {
	const { user } = await signUpTestUser({
		body: { email: `${username}@share.wakacraft.test`, password: 'correct-horse-battery', name: username },
	});
	await userProfileService.updateSettings(user.id, { username, timezone: 'UTC', ...settings });
	await heartbeatService.ingest(
		user.id,
		['oss', 'secret'].flatMap((project, p) =>
			Array.from({ length: 31 }, (_, index) => ({
				entity: `/src/${project}.rs`,
				type: 'file',
				category: 'coding',
				project,
				language: 'Rust',
				time: localDayBounds(day, 'UTC').start + (9 + p * 2) * 3600 + index * 60,
			})),
		),
		{ userAgent: null, machineName: null },
	);
	return user.id;
}

beforeAll(async () => {
	await connectMongo();
	const id = await makeUser('sharer', { loggedTimePublic: true, languagesUsedPublic: true, editorsUsedPublic: false });
	await mongoProjectService.updateMany({ userId: id, name: 'oss' }, { $set: { hasPublicUrl: true } });
	await makeUser('hider', { loggedTimePublic: false });
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('project badges', () => {
	it('renders an SVG badge with the all-time total for a public project', async () => {
		const badge = await fetchRoute(getBadge, '/x', { user: 'sharer', project: 'oss.svg' });
		expect(badge.status).toBe(200);
		expect(badge.type).toContain('image/svg+xml');
		expect(badge.body).toContain('30 mins');
	});

	it('returns the same 404 for private and missing projects', async () => {
		expect((await fetchRoute(getBadge, '/x', { user: 'sharer', project: 'secret.svg' })).status).toBe(404);
		expect((await fetchRoute(getBadge, '/x', { user: 'sharer', project: 'nope.svg' })).status).toBe(404);
	});
});

describe('share charts', () => {
	const share = (username: string, chart: string, query = '') =>
		fetchRoute(getShare as typeof getBadge, `/share/${username}/${chart}${query}`, { username, chart });

	it('renders a languages card, themable', async () => {
		const dark = await share('sharer', 'languages.svg');
		expect(dark.status).toBe(200);
		expect(dark.body).toContain('Rust');
		expect(dark.body).toContain('#11141b');
		expect((await share('sharer', 'languages.svg', '?theme=light')).body).toContain('#ffffff');
	});

	it('serves seven days of activity as JSON', async () => {
		const { status, body } = await share('sharer', 'activity.json');
		expect(status).toBe(200);
		const { data } = JSON.parse(body);
		expect(data.days).toHaveLength(7);
		expect(data.days.find((entry: { date: string }) => entry.date === day).seconds).toBe(3600);
	});

	it('renders a lifetime total card', async () => {
		const card = await share('sharer', 'total.svg');
		expect(card.status).toBe(200);
		expect(card.type).toContain('image/svg+xml');
		expect(card.body).toContain('Lifetime coding time');
		expect(card.body).toContain('1 hrs 0 mins');
		const { data } = JSON.parse((await share('sharer', 'total.json')).body);
		expect(data).toMatchObject({ totalSeconds: 3600, since: day });
	});

	it('respects per-breakdown privacy and private users', async () => {
		expect((await share('hider', 'total.svg')).status).toBe(403);
		expect((await share('sharer', 'editors.svg')).status).toBe(403);
		expect((await share('hider', 'languages.svg')).status).toBe(403);
		expect((await share('sharer', 'secrets.svg')).status).toBe(400);
	});
});
