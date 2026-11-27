import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth/auth';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { demoService } from '@/server/demo/demo.service';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';
import { publicProfileService } from '@/server/user/public-profile.service';
import { UpdateSettingsSchema } from '@/server/user/user.request.dto';

const username = 'demo-test';
let userId: string;

beforeAll(async () => {
	await connectMongo();
	({ userId } = await demoService.seed(username));
});

describe('public demo account', () => {
	it('serves a populated public profile', async () => {
		const view = await publicProfileService.getPageView(username);
		expect(view.stats?.total_seconds).toBeGreaterThan(0);
		expect(view.heatmap?.filter((day) => day.seconds > 0).length).toBeGreaterThan(30);
	});

	it('is replaced, not duplicated, when reseeded', async () => {
		const before = await mongoHeartbeatService.count({ userId });
		await demoService.seed(username);
		expect(await mongoHeartbeatService.count({ userId })).toBe(before);
	});

	it('stays off the public leaderboard', async () => {
		const { data } = await leaderboardService.publicLeaders({ page: 1 });
		expect(data.some((entry) => entry.user.username === username)).toBe(false);
	});

	it('is topped up nightly only when named as the demo account', async () => {
		expect(await demoService.appendRecent(undefined)).toBe(0);
		expect(await demoService.appendRecent('nobody-here')).toBe(0);
		await mongoUserProfileService.updateOne({ userId }, { $set: { isDemo: false } });
		expect(await demoService.appendRecent(username)).toBe(0);
		await mongoUserProfileService.updateOne({ userId }, { $set: { isDemo: true } });
	});

	it('refuses to have a sign-in account attached', async () => {
		const context = await auth.$context;
		await expect(
			context.internalAdapter.createAccount({ userId, providerId: 'github', accountId: 'takeover-attempt' }),
		).rejects.toThrow(/demo account/);
		expect(await context.internalAdapter.findAccounts(userId)).toEqual([]);
	});

	it('validates the seeded username format', async () => {
		await expect(demoService.seed('not a username!')).rejects.toMatchObject({ status: 400 });
	});
});

describe('reserved demo username', () => {
	afterEach(() => vi.unstubAllEnvs());

	const usernameError = (username: string) =>
		UpdateSettingsSchema.safeParse({ username }).error?.issues.find((issue) => issue.path[0] === 'username')?.message;

	it('keeps "demo" and DEMO_USERNAME from real accounts, case-insensitively', () => {
		vi.stubEnv('DEMO_USERNAME', 'Showcase');
		expect(usernameError('demo')).toBe('This username is reserved');
		expect(usernameError('DeMo')).toBe('This username is reserved');
		expect(usernameError('showcase')).toBe('This username is reserved');
		expect(usernameError('SHOWCASE')).toBe('This username is reserved');
		expect(UpdateSettingsSchema.safeParse({ username: 'Demo-Fan' }).data?.username).toBe('demo-fan');
	});

	it('reserves only "demo" when DEMO_USERNAME is unset', () => {
		vi.stubEnv('DEMO_USERNAME', undefined);
		expect(usernameError('demo')).toBe('This username is reserved');
		expect(UpdateSettingsSchema.safeParse({ username: 'showcase' }).success).toBe(true);
	});
});
