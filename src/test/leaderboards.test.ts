import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getLeaders } from '@/app/api/v1/leaders/route';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoLeaderboardCacheService } from '@/lib/mongo/leaderboard-cache/leaderboard-cache.service';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { call } from './api';
import { signUpTestUser } from './users';

const day = addDays(todayIn('UTC'), -1);
const ids: Record<string, string> = {};

async function makeUser(name: string, minutes: number, language: string, settings: Record<string, unknown>) {
	const { user } = await signUpTestUser({
		body: { email: `${name}@lb.wakacraft.test`, password: 'correct-horse-battery', name },
	});
	await userProfileService.updateSettings(user.id, { username: name, timezone: 'UTC', ...settings });
	await heartbeatService.ingest(
		user.id,
		Array.from({ length: minutes + 1 }, (_, index) => ({
			entity: `/src/main.${language}`,
			type: 'file',
			category: 'coding',
			language,
			time: localDayBounds(day, 'UTC').start + 9 * 3600 + index * 60,
		})),
		{ userAgent: null, machineName: null },
	);
	ids[name] = user.id;
}

const leaders = async (query = '') => (await call(getLeaders, { path: `/api/v1/leaders${query}` })).json;
// Other test files share the database, so only this file's users (lb-*) are asserted on.
type Leaders = {
	data: {
		rank: number;
		running_total: { total_seconds: number; human_readable_total: string; languages: unknown[] };
		user: { username: string | null };
	}[];
};
const ours = (json: Leaders) => json.data.filter((entry) => entry.user.username?.startsWith('lb-'));
const usernames = (json: Leaders) => ours(json).map((entry) => entry.user.username);
const entryOf = (json: Leaders, username: string) => json.data.find((entry) => entry.user.username === username)!;

beforeAll(async () => {
	await connectMongo();
	await makeUser('lb-ana', 20, 'Rust', { loggedTimePublic: true, languagesUsedPublic: true });
	await makeUser('lb-ben', 10, 'Go', { loggedTimePublic: true, languagesUsedPublic: false });
	await makeUser('lb-cat', 30, 'Zig', { loggedTimePublic: false });
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('public leaderboard', () => {
	it('ranks only users who made their time public', async () => {
		const json = await leaders();
		expect(usernames(json)).toEqual(['lb-ana', 'lb-ben']);
		expect(entryOf(json, 'lb-ana').running_total).toMatchObject({
			total_seconds: 1200,
			human_readable_total: '20 mins',
		});
		expect(entryOf(json, 'lb-ana').rank).toBeLessThan(entryOf(json, 'lb-ben').rank);
		expect(json.range).toMatchObject({ name: 'last_7_days' });
	});

	it('hides languages of users who keep them private', async () => {
		const json = await leaders();
		expect(entryOf(json, 'lb-ana').running_total.languages).toEqual([{ name: 'Rust', total_seconds: 1200 }]);
		expect(entryOf(json, 'lb-ben').running_total.languages).toEqual([]);
	});

	it('ranks by one language, never by a private one', async () => {
		expect(usernames(await leaders('?language=rust'))).toEqual(['lb-ana']);
		expect(usernames(await leaders('?language=Go'))).toEqual([]);
	});

	it('drops a user who goes private even while the ranking is cached', async () => {
		await userProfileService.updateSettings(ids['lb-ben'], { loggedTimePublic: false });
		expect(usernames(await leaders())).toEqual(['lb-ana']);
		await userProfileService.updateSettings(ids['lb-ben'], { loggedTimePublic: true });
	});
});

describe('private leaderboards', () => {
	let boardId: string;
	let inviteCode: string;

	it('lets the owner create a board and others join by invite code', async () => {
		const created = await leaderboardService.createBoard(ids['lb-cat'], 'Friday crew');
		boardId = created.data.id;
		inviteCode = created.data.invite_code;
		await leaderboardService.joinBoard(ids['lb-ana'], inviteCode);

		const board = await leaderboardService.boardLeaders(ids['lb-ana'], boardId, { page: 1 });
		// Members see each other's time, including a member who is private publicly.
		expect(usernames(board)).toEqual(['lb-cat', 'lb-ana']);
		expect(entryOf(board, 'lb-cat').running_total.languages).toEqual([{ name: 'Zig', total_seconds: 1800 }]);
	});

	it('keeps non-members out', async () => {
		await expect(leaderboardService.boardLeaders(ids['lb-ben'], boardId, { page: 1 })).rejects.toThrow(/not a member/);
	});

	it('refreshes the ranking when membership changes', async () => {
		await leaderboardService.joinBoard(ids['lb-ben'], inviteCode);
		expect(usernames(await leaderboardService.boardLeaders(ids['lb-ben'], boardId, { page: 1 }))).toEqual([
			'lb-cat',
			'lb-ana',
			'lb-ben',
		]);
		expect(await leaderboardService.leaveOrDelete(ids['lb-ben'], boardId)).toBe('left');
		expect(usernames(await leaderboardService.boardLeaders(ids['lb-ana'], boardId, { page: 1 }))).toEqual([
			'lb-cat',
			'lb-ana',
		]);
	});

	it('deletes the board, its members and its cache when the owner removes it', async () => {
		expect(await leaderboardService.leaveOrDelete(ids['lb-cat'], boardId)).toBe('deleted');
		expect((await leaderboardService.listBoards(ids['lb-ana'])).data).toEqual([]);
		expect(await mongoLeaderboardCacheService.count({ board: boardId })).toBe(0);
	});
});
