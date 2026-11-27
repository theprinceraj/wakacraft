import { createHash } from 'node:crypto';

import { makeSignature } from 'better-auth/crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as postBulk } from '@/app/api/v1/users/[user]/heartbeats.bulk/route';
import { GET as getSummaries } from '@/app/api/v1/users/[user]/summaries/route';
import { auth } from '@/lib/auth/auth';
import { mongoApiKeyService } from '@/lib/mongo/api-key/api-key.service';
import { mongoClientService } from '@/lib/mongo/client/client.service';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoCustomRuleService } from '@/lib/mongo/custom-rule/custom-rule.service';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoDataDumpService } from '@/lib/mongo/data-dump/data-dump.service';
import { mongoExternalDurationService } from '@/lib/mongo/external-duration/external-duration.service';
import { mongoGlobalStatsService } from '@/lib/mongo/global-stats/global-stats.service';
import { mongoGoalService } from '@/lib/mongo/goal/goal.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoInvoiceService } from '@/lib/mongo/invoice/invoice.service';
import { mongoLeaderboardCacheService } from '@/lib/mongo/leaderboard-cache/leaderboard-cache.service';
import { mongoLeaderboardMemberService } from '@/lib/mongo/leaderboard-member/leaderboard-member.service';
import { mongoLeaderboardService } from '@/lib/mongo/leaderboard/leaderboard.service';
import { mongoMachineService } from '@/lib/mongo/machine/machine.service';
import { mongoOAuthAppService } from '@/lib/mongo/oauth-app/oauth-app.service';
import { mongoOAuthCodeService } from '@/lib/mongo/oauth-code/oauth-code.service';
import { mongoOAuthTokenService } from '@/lib/mongo/oauth-token/oauth-token.service';
import { mongoOrgDashboardService } from '@/lib/mongo/org-dashboard/org-dashboard.service';
import { mongoOrgMemberService } from '@/lib/mongo/org-member/org-member.service';
import { mongoOrgService } from '@/lib/mongo/org/org.service';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { mongoRateLimitService } from '@/lib/mongo/rate-limit/rate-limit.service';
import { mongoRollupInvalidationService } from '@/lib/mongo/rollup-invalidation/rollup-invalidation.service';
import { mongoRuleJobService } from '@/lib/mongo/rule-job/rule-job.service';
import { mongoUserAgentService } from '@/lib/mongo/user-agent/user-agent.service';
import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { mongoWakatimeImportService } from '@/lib/mongo/wakatime-import/wakatime-import.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { accountDeletionService } from '@/server/account/account-deletion.service';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';
import { AuthorizeQuerySchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';
import { orgService } from '@/server/org/org.service';
import { rateLimitService } from '@/server/rate-limit/rate-limit.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { basicAuth, call, CLI_USER_AGENT } from './api';
import { signUpTestUser } from './users';

const yesterday = addDays(todayIn('UTC'), -1);
const t0 = localDayBounds(yesterday, 'UTC').start + 10 * 3600;
let serial = 0;

const cliHeaders = (apiKey: string) => ({
	...basicAuth(apiKey),
	'user-agent': CLI_USER_AGENT,
	'x-machine-name': 'box',
});

async function makeUser(name: string) {
	const { user } = await signUpTestUser({ body: { email: `${name}@delete.wakacraft.test`, name } });
	await userProfileService.updateSettings(user.id, { username: name, timezone: 'UTC', loggedTimePublic: true });
	const { key } = await apiKeyService.create(user.id, 'Laptop');
	return { userId: user.id, apiKey: key };
}

/** A browser session for `userId`, as the session cookie Better Auth would have set at sign-in (at `createdAt`). */
async function sessionHeaders(userId: string, createdAt?: Date) {
	const context = await auth.$context;
	const session = await context.internalAdapter.createSession(
		userId,
		false,
		createdAt ? { createdAt } : undefined,
		true,
	);
	const signed = `${session.token}.${await makeSignature(session.token, context.secret)}`;
	return new Headers({ cookie: `${context.authCookies.sessionToken.name}=${signed}` });
}

/** `POST /api/auth/delete-user` with a fresh session, as the settings page sends it. */
async function deleteViaAuth(userId: string, createdAt?: Date) {
	const response = await auth.api.deleteUser({
		headers: await sessionHeaders(userId, createdAt),
		body: {},
		asResponse: true,
	});
	return { status: response.status, json: await response.json() };
}

/** Fills every collection that holds per-user data. */
async function seed(userId: string, apiKey: string) {
	const n = ++serial;
	const posted = await call(postBulk, {
		path: '/api/v1/users/current/heartbeats.bulk',
		method: 'POST',
		headers: cliHeaders(apiKey),
		body: [0, 60, 120].map((offset) => ({
			entity: '/src/app.ts',
			type: 'file',
			category: 'coding',
			time: t0 + offset,
			project: `app-${n}`,
			language: 'TypeScript',
		})),
	});
	expect(posted.status).toBe(202);
	// Reading a finished day caches it as a daily summary.
	await call(getSummaries, {
		path: `/api/v1/users/current/summaries?start=${yesterday}&end=${yesterday}`,
		headers: basicAuth(apiKey),
	});
	await rateLimitService.consume(userId, 'aggregate');

	const client = await mongoClientService.create({ userId, name: 'Acme', hourlyRate: 50 });
	const app = await mongoOAuthAppService.create({
		ownerId: userId,
		name: `App ${n}`,
		redirectUris: ['https://example.com/cb'],
		clientId: `client-${userId}`,
		clientSecretHash: `secret-${userId}`,
	});
	const expiresAt = new Date(Date.now() + 3_600_000);
	await Promise.all([
		mongoGoalService.create({ userId, delta: 'day', seconds: 3600 }),
		mongoInvoiceService.create({
			userId,
			clientId: client.id,
			clientName: 'Acme',
			number: 1,
			start: yesterday,
			end: yesterday,
			currency: 'USD',
			lineItems: [],
			total: 0,
			issuedAt: new Date(),
		}),
		mongoCustomRuleService.create({
			userId,
			action: 'change',
			source: 'project',
			operation: 'equals',
			sourceValue: 'x',
			destinations: [{ id: 'dest-1', destination: 'project', destinationValue: 'y' }],
			priority: 1,
		}),
		mongoRuleJobService.create({ userId, status: 'done' }),
		mongoExternalDurationService.create({
			userId,
			externalId: `ext-${n}`,
			entity: 'meeting',
			type: 'app',
			startTime: t0,
			endTime: t0 + 600,
		}),
		mongoDataDumpService.create({ userId, type: 'heartbeats', expiresAt }),
		mongoWakatimeImportService.create({
			userId,
			status: 'running',
			token: 'encrypted-token',
			startDate: yesterday,
			endDate: yesterday,
			cursor: yesterday,
			daysTotal: 1,
			// Held far into the future so no cron or poll in another test file picks the job up.
			leaseUntil: new Date(Date.now() + 86_400_000),
		}),
		mongoRollupInvalidationService.create({ userId, date: addDays(yesterday, -5), at: new Date() }),
		mongoOAuthCodeService.create({
			codeHash: `code-${userId}`,
			appId: app.id,
			userId,
			scopes: ['read_summaries'],
			redirectUri: 'https://example.com/cb',
			expiresAt,
		}),
		mongoOAuthTokenService.create({
			appId: app.id,
			userId,
			scopes: ['read_summaries'],
			accessTokenHash: `access-${userId}`,
			refreshTokenHash: `refresh-${userId}`,
			accessExpiresAt: expiresAt,
		}),
	]);
	return { appId: app.id };
}

/** Per-user document counts across every collection that references a user. */
async function countsFor(userId: string, appId?: string) {
	const byUser = { userId };
	const entries = await Promise.all(
		Object.entries({
			heartbeats: mongoHeartbeatService.count(byUser),
			projects: mongoProjectService.count(byUser),
			machines: mongoMachineService.count(byUser),
			userAgents: mongoUserAgentService.count(byUser),
			dailySummaries: mongoDailySummaryService.count(byUser),
			rollupInvalidations: mongoRollupInvalidationService.count(byUser),
			apiKeys: mongoApiKeyService.count(byUser),
			customRules: mongoCustomRuleService.count(byUser),
			ruleJobs: mongoRuleJobService.count(byUser),
			goals: mongoGoalService.count(byUser),
			externalDurations: mongoExternalDurationService.count(byUser),
			dataDumps: mongoDataDumpService.count(byUser),
			wakatimeImports: mongoWakatimeImportService.count(byUser),
			clients: mongoClientService.count(byUser),
			invoices: mongoInvoiceService.count(byUser),
			oauthApps: mongoOAuthAppService.count({ ownerId: userId }),
			oauthCodes: mongoOAuthCodeService.count({ $or: [byUser, ...(appId ? [{ appId }] : [])] }),
			oauthTokens: mongoOAuthTokenService.count({ $or: [byUser, ...(appId ? [{ appId }] : [])] }),
			// What seed() fills: `aggregate:<id>:<window>` and `heartbeats:<id>:<window>`.
			rateLimits: mongoRateLimitService.count({ key: { $regex: `^(aggregate|heartbeats):${userId}:` } }),
			leaderboards: mongoLeaderboardService.count({ ownerId: userId }),
			leaderboardMembers: mongoLeaderboardMemberService.count(byUser),
			orgMembers: mongoOrgMemberService.count(byUser),
			profiles: mongoUserProfileService.count(byUser),
		}).map(async ([name, count]) => [name, await count] as const),
	);
	return Object.fromEntries(entries);
}

const authUser = async (userId: string) => (await auth.$context).internalAdapter.findUserById(userId);

beforeAll(async () => {
	await connectMongo();
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

afterEach(() => {
	vi.restoreAllMocks();
});

const heartbeatFor = (userId: string, time: number) =>
	mongoHeartbeatService.create({
		userId,
		entity: '/src/late.ts',
		type: 'file',
		category: 'coding',
		time,
		isWrite: false,
		dedupHash: `late-${userId}-${time}`,
	});

describe('account deletion', () => {
	it('removes the user and everything they own, and leaves other users alone', async () => {
		const gone = await makeUser('del-gone');
		const kept = await makeUser('del-kept');
		const { appId } = await seed(gone.userId, gone.apiKey);
		const keptApp = await seed(kept.userId, kept.apiKey);
		const keptBefore = await countsFor(kept.userId, keptApp.appId);
		// Another user's token for the deleted user's app goes with the app.
		const foreignToken = await mongoOAuthTokenService.create({
			appId,
			userId: kept.userId,
			scopes: ['read_summaries'],
			accessTokenHash: `foreign-${kept.userId}`,
			refreshTokenHash: `foreign-refresh-${kept.userId}`,
			accessExpiresAt: new Date(Date.now() + 3_600_000),
		});

		const before = await countsFor(gone.userId, appId);
		for (const [name, count] of Object.entries(before)) {
			if (!['leaderboards', 'leaderboardMembers', 'orgMembers'].includes(name)) {
				expect(count, `seeded ${name}`).toBeGreaterThan(0);
			}
		}

		const { status, json } = await deleteViaAuth(gone.userId);
		expect(status).toBe(200);
		expect(json).toMatchObject({ success: true });

		const after = await countsFor(gone.userId, appId);
		for (const [name, count] of Object.entries(after)) expect(count, name).toBe(0);
		expect(await mongoOAuthTokenService.exists({ id: foreignToken.id })).toBe(false);
		expect(await authUser(gone.userId)).toBeNull();
		expect(await (await auth.$context).internalAdapter.listSessions(gone.userId)).toEqual([]);

		expect(await countsFor(kept.userId, keptApp.appId)).toEqual({
			...keptBefore,
			// Other users' rate-limit windows keep counting on their own; only compare that they still exist.
			rateLimits: expect.any(Number),
		});
		expect(await authUser(kept.userId)).not.toBeNull();
	});

	it("revokes the user's API keys: a heartbeat with one is refused", async () => {
		const { userId, apiKey } = await makeUser('del-key');
		expect((await deleteViaAuth(userId)).status).toBe(200);

		const { status } = await call(postBulk, {
			path: '/api/v1/users/current/heartbeats.bulk',
			method: 'POST',
			headers: cliHeaders(apiKey),
			body: [{ entity: '/src/a.ts', type: 'file', time: t0 }],
		});
		expect(status).toBe(401);
	});

	it('refuses while the user owns a team others belong to, and deletes nothing', async () => {
		const owner = await makeUser('del-owner');
		const mate = await makeUser('del-mate');
		const { data: org } = await orgService.createOrg(owner.userId, 'Shared Team');
		await orgService.joinOrg(mate.userId, org.invite_code!);
		const before = await countsFor(owner.userId);

		const { status, json } = await deleteViaAuth(owner.userId);
		expect(status).toBe(409);
		expect(json.message).toContain('Delete "Shared Team" first');

		expect(await countsFor(owner.userId)).toEqual(before);
		expect(await authUser(owner.userId)).not.toBeNull();
		expect(await mongoOrgService.exists({ id: org.id })).toBe(true);
	});

	it('deletes a team the user is the only member of, and leaves the teams of others', async () => {
		const solo = await makeUser('del-solo');
		const host = await makeUser('del-host');
		const { data: own } = await orgService.createOrg(solo.userId, 'Just Me');
		const { data: other } = await orgService.createOrg(host.userId, 'Host Team');
		await orgService.joinOrg(solo.userId, other.invite_code!);

		expect((await deleteViaAuth(solo.userId)).status).toBe(200);

		expect(await mongoOrgService.exists({ id: own.id })).toBe(false);
		expect(await mongoOrgDashboardService.count({ orgId: own.id })).toBe(0);
		expect(await mongoOrgMemberService.count({ orgId: own.id })).toBe(0);
		expect(await mongoOrgService.exists({ id: other.id })).toBe(true);
		expect((await mongoOrgMemberService.find({ orgId: other.id }, ['userId'])).map((m) => m.userId)).toEqual([
			host.userId,
		]);
	});

	it('hands a team over when another owner remains', async () => {
		const first = await makeUser('del-first');
		const second = await makeUser('del-second');
		const { data: org } = await orgService.createOrg(first.userId, 'Two Owners');
		await mongoOrgMemberService.create({ orgId: org.id, userId: second.userId, role: 'owner' });

		expect((await deleteViaAuth(first.userId)).status).toBe(200);

		expect(await mongoOrgService.findOne({ id: org.id }, ['ownerId'])).toMatchObject({ ownerId: second.userId });
		expect(await mongoOrgMemberService.exists({ orgId: org.id, userId: first.userId })).toBe(false);
	});

	it('deletes owned leaderboards with their members and leaves the others', async () => {
		const boss = await makeUser('del-boss');
		const peer = await makeUser('del-peer');
		const { data: owned } = await leaderboardService.createBoard(boss.userId, 'Mine');
		const { data: joined } = await leaderboardService.createBoard(peer.userId, 'Theirs');
		await leaderboardService.joinBoard(peer.userId, owned.invite_code);
		await leaderboardService.joinBoard(boss.userId, joined.invite_code);
		await seed(boss.userId, boss.apiKey);
		// Cache the joined board's ranking with the user in it, plus the site-wide stats.
		await leaderboardService.boardLeaders(peer.userId, joined.id, { page: 1 });
		expect(await mongoLeaderboardCacheService.exists({ board: joined.id, 'entries.userId': boss.userId })).toBe(true);
		await mongoGlobalStatsService.updateOne(
			{ range: 'last_7_days' },
			{
				$set: { start: yesterday, end: yesterday, users: 1, totalSeconds: 1, computedAt: new Date() },
				$setOnInsert: { range: 'last_7_days', languages: [], editors: [], categories: [], operatingSystems: [] },
			},
			{ upsert: true, setDefaultsOnInsert: true },
		);

		expect((await deleteViaAuth(boss.userId)).status).toBe(200);

		expect(await mongoLeaderboardService.exists({ id: owned.id })).toBe(false);
		expect(await mongoLeaderboardMemberService.count({ leaderboardId: owned.id })).toBe(0);
		expect(await mongoLeaderboardService.exists({ id: joined.id })).toBe(true);
		expect(
			(await mongoLeaderboardMemberService.find({ leaderboardId: joined.id }, ['userId'])).map((m) => m.userId),
		).toEqual([peer.userId]);
		expect(await mongoLeaderboardCacheService.exists({ 'entries.userId': boss.userId })).toBe(false);
		expect(await mongoGlobalStatsService.exists({ range: 'last_7_days' })).toBe(false);
		// The board still works for the people left on it.
		const { data } = await leaderboardService.boardLeaders(peer.userId, joined.id, { page: 1 });
		expect(data.map((entry) => entry.user.id)).not.toContain(boss.userId);
	});

	it('refuses to delete the demo account', async () => {
		const { userId } = await makeUser('del-demo');
		await mongoUserProfileService.updateOne({ userId }, { $set: { isDemo: true } });

		await expect(accountDeletionService.deleteAccountData(userId)).rejects.toMatchObject({ status: 403 });
		const { status } = await deleteViaAuth(userId);
		expect(status).toBe(403);
		expect(await mongoUserProfileService.exists({ userId })).toBe(true);
		expect(await mongoApiKeyService.count({ userId })).toBe(1);
		expect(await authUser(userId)).not.toBeNull();
	});

	it('can be run again after a partial failure without harm', async () => {
		const { userId, apiKey } = await makeUser('del-again');
		await seed(userId, apiKey);

		await accountDeletionService.deleteAccountData(userId);
		await expect(accountDeletionService.deleteAccountData(userId)).resolves.toBeUndefined();
		expect((await deleteViaAuth(userId)).status).toBe(200);

		for (const [name, count] of Object.entries(await countsFor(userId))) expect(count, name).toBe(0);
		expect(await authUser(userId)).toBeNull();
	});

	it('refuses a session older than a day, and deletes nothing', async () => {
		const { userId, apiKey } = await makeUser('del-stale');
		await seed(userId, apiKey);
		const before = await countsFor(userId);

		const { status, json } = await deleteViaAuth(userId, new Date(Date.now() - 2 * 86_400_000));
		expect(status).toBe(400);
		expect(json.code).toBe('SESSION_EXPIRED');

		expect(await countsFor(userId)).toEqual(before);
		expect(await authUser(userId)).not.toBeNull();
	});

	it('refuses to issue credentials for a deleted user', async () => {
		const { userId } = await makeUser('del-mint');
		const owner = await makeUser('del-mint-app');
		const { data: app } = await oauthService.createApp(owner.userId, {
			name: 'Minter',
			redirectUris: ['https://example.com/cb'],
		});
		expect((await deleteViaAuth(userId)).status).toBe(200);

		// What a stale cookie-cached session on another device would still try.
		await expect(apiKeyService.create(userId, 'Late key')).rejects.toMatchObject({ status: 401 });
		const query = AuthorizeQuerySchema.parse({
			client_id: app.client_id,
			redirect_uri: 'https://example.com/cb',
			response_type: 'code',
			scope: 'read_summaries',
		});
		await expect(oauthService.approve(userId, query)).rejects.toMatchObject({ status: 401 });
		expect(await mongoApiKeyService.count({ userId })).toBe(0);
		expect(await mongoOAuthCodeService.count({ userId })).toBe(0);

		// A code that slipped in before the account went can't be exchanged for tokens either.
		const code = 'late-code';
		await mongoOAuthCodeService.create({
			codeHash: createHash('sha256').update(code).digest('hex'),
			appId: app.id,
			userId,
			scopes: ['read_summaries'],
			redirectUri: 'https://example.com/cb',
			expiresAt: new Date(Date.now() + 600_000),
		});
		await expect(
			oauthService.exchange({
				grant_type: 'authorization_code',
				client_id: app.client_id,
				client_secret: app.client_secret,
				code,
				redirect_uri: 'https://example.com/cb',
			}),
		).rejects.toMatchObject({ code: 'invalid_grant', status: 401 });
		expect(await mongoOAuthTokenService.count({ userId })).toBe(0);
	});

	it('sweeps up data written between the two passes', async () => {
		const { userId, apiKey } = await makeUser('del-late');
		await seed(userId, apiKey);
		const original = accountDeletionService.deleteAccountData.bind(accountDeletionService);
		const spy = vi.spyOn(accountDeletionService, 'deleteAccountData').mockImplementationOnce(async (...args) => {
			await original(...args);
			// An in-flight bulk request lands after the first pass.
			await heartbeatFor(userId, t0 + 900);
		});

		expect((await deleteViaAuth(userId)).status).toBe(200);

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith(userId, { afterUserDeleted: true });
		for (const [name, count] of Object.entries(await countsFor(userId))) expect(count, name).toBe(0);
	});

	it('still reports success when the second pass fails, and logs it', async () => {
		const { userId } = await makeUser('del-late-fail');
		const original = accountDeletionService.deleteAccountData.bind(accountDeletionService);
		vi.spyOn(accountDeletionService, 'deleteAccountData').mockImplementation(async (id, options) => {
			if (options?.afterUserDeleted) throw new Error('mongo went away');
			return original(id, options);
		});
		const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		expect((await deleteViaAuth(userId)).status).toBe(200);
		expect(await authUser(userId)).toBeNull();
		expect(logged).toHaveBeenCalledWith(expect.stringContaining(userId), expect.any(Error));
	});

	it('takes the user off dashboards of teams they leave, deleting ones that showed only them', async () => {
		const leaver = await makeUser('del-dash');
		const host = await makeUser('del-dash-host');
		const { data: org } = await orgService.createOrg(host.userId, 'Dash Team');
		await orgService.joinOrg(leaver.userId, org.invite_code!);
		const onlyThem = await mongoOrgDashboardService.create({
			orgId: org.id,
			name: 'Only them',
			memberIds: [leaver.userId],
		});
		const both = await mongoOrgDashboardService.create({
			orgId: org.id,
			name: 'Both',
			memberIds: [leaver.userId, host.userId],
		});
		const everyone = await mongoOrgDashboardService.create({ orgId: org.id, name: 'Everyone', memberIds: [] });

		expect((await deleteViaAuth(leaver.userId)).status).toBe(200);

		// Empty `memberIds` means every member: "Only them" must not quietly become that.
		expect(await mongoOrgDashboardService.exists({ id: onlyThem.id })).toBe(false);
		expect(await mongoOrgDashboardService.findOne({ id: both.id }, ['memberIds'])).toMatchObject({
			memberIds: [host.userId],
		});
		expect(await mongoOrgDashboardService.findOne({ id: everyone.id }, ['memberIds'])).toMatchObject({
			memberIds: [],
		});
	});

	it("clears the user's rate-limit counters and nobody else's", async () => {
		const { userId } = await makeUser('del-limits');
		const other = await makeUser('del-limits-x');
		const expiresAt = new Date(Date.now() + 3_600_000);
		const window = 1_700_000_000_000;
		const mine = [`aggregate:${userId}:${window}`, `heartbeats:${userId}:oauth:app-1:${window}`];
		// An id that starts with the deleted one, and another user.
		const theirs = [`aggregate:${userId}0:${window}`, `heartbeats:${other.userId}:${window}`];
		for (const key of [...mine, ...theirs]) await mongoRateLimitService.increment(key, 1, expiresAt);

		expect((await deleteViaAuth(userId)).status).toBe(200);

		expect(await mongoRateLimitService.count({ key: { $in: mine } })).toBe(0);
		expect(await mongoRateLimitService.count({ key: { $in: theirs } })).toBe(theirs.length);
	});
});
