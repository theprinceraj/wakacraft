import { randomBytes } from 'node:crypto';

import { BadRequestException, ForbiddenException, NotFoundException } from '@/lib/http/errors';
import { mongoLeaderboardCacheService } from '@/lib/mongo/leaderboard-cache/leaderboard-cache.service';
import { mongoLeaderboardMemberService } from '@/lib/mongo/leaderboard-member/leaderboard-member.service';
import { mongoLeaderboardService } from '@/lib/mongo/leaderboard/leaderboard.service';
import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { inBatches } from '@/lib/util/Async';
import { addDays, eachDate, humanizeSeconds, round, todayIn } from '@/lib/util/Time';
import { loadDayTotals } from '@/server/stats/day-totals';
import { mergeStatTotals } from '@/server/stats/engine';
import { statsService } from '@/server/stats/stats.service';
import { publicProfileService } from '@/server/user/public-profile.service';

import type { ILeaderboardCacheZodSchema, ILeaderboardZodSchema } from '@/lib/mongo/zod';

export const PUBLIC_BOARD = 'public';
const CACHE_MINUTES = 10;
export const LEADERS_PAGE_SIZE = 100;
const RANGE_DAYS = 7;
/** Users ranked concurrently while rebuilding a board. */
const CONCURRENCY = 8;
const MAX_BOARDS_PER_USER = 20;

type Entry = ILeaderboardCacheZodSchema['entries'][number];

/** One user's last 7 days, in that user's own timezone and settings. */
async function weekFor(userId: string): Promise<Entry> {
	const settings = await statsService.resolveSettings(userId);
	const today = todayIn(settings.timezone);
	const dates = eachDate(addDays(today, -(RANGE_DAYS - 1)), today);
	const totals = await loadDayTotals(userId, dates, settings);
	const days = dates.map((date) => totals.get(date)!);
	return {
		userId,
		totalSeconds: days.reduce((sum, day) => sum + day.totalSeconds, 0),
		languages: mergeStatTotals(days.map((day) => day.languages)).map(({ name, totalSeconds }) => ({
			name,
			totalSeconds,
		})),
	};
}

class LeaderboardService {
	/** Ranked entries for a board, from the cache when fresh. */
	private async ranking(board: string, userIds: () => Promise<string[]>): Promise<ILeaderboardCacheZodSchema> {
		const cached = await mongoLeaderboardCacheService.findOne({ board });
		if (cached && Date.now() - cached.computedAt.getTime() < CACHE_MINUTES * 60_000) return cached;

		const entries = (await inBatches(await userIds(), CONCURRENCY, weekFor))
			.filter((entry) => entry.totalSeconds > 0)
			.sort((a, b) => b.totalSeconds - a.totalSeconds);
		const today = todayIn('UTC');
		const fields = { start: addDays(today, -(RANGE_DAYS - 1)), end: today, entries, computedAt: new Date() };

		const saved = await mongoLeaderboardCacheService.updateOne(
			{ board },
			{ $set: fields, $setOnInsert: { board } },
			{ upsert: true, setDefaultsOnInsert: true },
		);
		return saved!;
	}

	private invalidate(board: string) {
		return mongoLeaderboardCacheService.deleteMany({ board });
	}

	/** Shapes entries in WakaTime's `leaders` format, optionally ranked by one language. */
	private async present(
		cache: ILeaderboardCacheZodSchema,
		{ language, page, showLanguages }: { language?: string; page: number; showLanguages: (userId: string) => boolean },
	) {
		const ranked = cache.entries
			.map((entry) => ({
				entry,
				seconds: language
					? (entry.languages.find((item) => item.name.toLowerCase() === language.toLowerCase())?.totalSeconds ?? 0)
					: entry.totalSeconds,
			}))
			.filter(({ entry, seconds }) => seconds > 0 && (!language || showLanguages(entry.userId)))
			.sort((a, b) => b.seconds - a.seconds);

		const totalPages = Math.max(1, Math.ceil(ranked.length / LEADERS_PAGE_SIZE));
		const pageItems = ranked.slice((page - 1) * LEADERS_PAGE_SIZE, page * LEADERS_PAGE_SIZE);
		const users = await Promise.all(pageItems.map(({ entry }) => publicProfileService.getPublicUser(entry.userId)));

		return {
			data: pageItems.map(({ entry, seconds }, index) => ({
				rank: (page - 1) * LEADERS_PAGE_SIZE + index + 1,
				running_total: {
					total_seconds: round(seconds),
					human_readable_total: humanizeSeconds(seconds),
					daily_average: round(seconds / RANGE_DAYS),
					human_readable_daily_average: humanizeSeconds(seconds / RANGE_DAYS),
					languages: showLanguages(entry.userId)
						? entry.languages.slice(0, 5).map((item) => ({ name: item.name, total_seconds: round(item.totalSeconds) }))
						: [],
				},
				user: users[index],
			})),
			page,
			total_pages: totalPages,
			language: language ?? null,
			range: { start_date: cache.start, end_date: cache.end, name: 'last_7_days', text: 'Last 7 Days' },
			modified_at: cache.computedAt.toISOString(),
			timeout: 15,
			writes_only: false,
		};
	}

	/** The public leaderboard: everyone with a username who made their coding time public. */
	public async publicLeaders(query: { language?: string; page: number }) {
		const profiles = await mongoUserProfileService.find({ loggedTimePublic: true, username: { $type: 'string' } }, [
			'userId',
			'languagesUsedPublic',
		]);
		const languagesPublic = new Set(
			profiles.filter((profile) => profile.languagesUsedPublic).map((profile) => profile.userId),
		);
		const cache = await this.ranking(PUBLIC_BOARD, async () => profiles.map((profile) => profile.userId));
		// The cache may predate someone going private; never show a user who isn't public right now.
		const eligible = new Set(profiles.map((profile) => profile.userId));
		return this.present(
			{ ...cache, entries: cache.entries.filter((entry) => eligible.has(entry.userId)) },
			{ ...query, showLanguages: (userId) => languagesPublic.has(userId) },
		);
	}

	// --- private boards -------------------------------------------------------------------------------------------

	public async listBoards(userId: string) {
		const memberships = await mongoLeaderboardMemberService.find({ userId }, ['leaderboardId']);
		const boards = await mongoLeaderboardService.find(
			{ id: { $in: memberships.map((membership) => membership.leaderboardId) } },
			'',
			{ sort: { createdAt: 1 } },
		);
		const counts = await Promise.all(
			boards.map((board) => mongoLeaderboardMemberService.count({ leaderboardId: board.id })),
		);
		const data = boards.map((board, index) => this.toBoardResponse(board, userId, counts[index]));
		return { data, total: data.length, total_pages: 1 };
	}

	public async createBoard(userId: string, name: string) {
		if ((await mongoLeaderboardService.count({ ownerId: userId })) >= MAX_BOARDS_PER_USER) {
			throw new BadRequestException(`You can own at most ${MAX_BOARDS_PER_USER} leaderboards`);
		}
		const board = await mongoLeaderboardService.create({
			ownerId: userId,
			name,
			inviteCode: randomBytes(9).toString('base64url'),
		});
		await mongoLeaderboardMemberService.create({ leaderboardId: board.id, userId });
		return { data: this.toBoardResponse(board, userId, 1) };
	}

	/** For the invite landing page: the board's name only, without joining. */
	public async previewInvite(inviteCode: string): Promise<{ name: string } | null> {
		return mongoLeaderboardService.findOne({ inviteCode }, ['name']);
	}

	public async joinBoard(userId: string, inviteCode: string) {
		const board = await mongoLeaderboardService.findOne({ inviteCode });
		if (!board) throw new NotFoundException('That invite link is not valid');
		await mongoLeaderboardMemberService.updateOne(
			{ leaderboardId: board.id, userId },
			{ $setOnInsert: { leaderboardId: board.id, userId } },
			{ upsert: true, setDefaultsOnInsert: true },
		);
		await this.invalidate(board.id);
		return {
			data: this.toBoardResponse(board, userId, await mongoLeaderboardMemberService.count({ leaderboardId: board.id })),
		};
	}

	/** The owner deletes the board; anyone else leaves it. */
	public async leaveOrDelete(userId: string, boardId: string): Promise<'deleted' | 'left'> {
		const board = await this.requireMember(userId, boardId);
		if (board.ownerId === userId) {
			await Promise.all([
				mongoLeaderboardService.deleteOne({ id: boardId }, 'id'),
				mongoLeaderboardMemberService.deleteMany({ leaderboardId: boardId }),
				this.invalidate(boardId),
			]);
			return 'deleted';
		}
		await Promise.all([
			mongoLeaderboardMemberService.deleteMany({ leaderboardId: boardId, userId }),
			this.invalidate(boardId),
		]);
		return 'left';
	}

	public async boardLeaders(userId: string, boardId: string, query: { language?: string; page: number }) {
		const board = await this.requireMember(userId, boardId);
		const cache = await this.ranking(board.id, async () =>
			(await mongoLeaderboardMemberService.find({ leaderboardId: board.id }, ['userId'])).map(
				(member) => member.userId,
			),
		);
		// Members agreed to share their time with the board, languages included.
		return {
			...(await this.present(cache, { ...query, showLanguages: () => true })),
			board: this.toBoardResponse(board, userId),
		};
	}

	public async getBoard(userId: string, boardId: string) {
		const board = await this.requireMember(userId, boardId);
		return this.toBoardResponse(board, userId, await mongoLeaderboardMemberService.count({ leaderboardId: boardId }));
	}

	private async requireMember(userId: string, boardId: string): Promise<ILeaderboardZodSchema> {
		const [board, membership] = await Promise.all([
			mongoLeaderboardService.findOne({ id: boardId }),
			mongoLeaderboardMemberService.exists({ leaderboardId: boardId, userId }),
		]);
		if (!board) throw new NotFoundException('Leaderboard not found');
		if (!membership) throw new ForbiddenException('You are not a member of this leaderboard');
		return board;
	}

	private toBoardResponse(board: ILeaderboardZodSchema, userId: string, membersCount?: number) {
		const isOwner = board.ownerId === userId;
		return {
			id: board.id,
			name: board.name,
			time_range: 'last_7_days' as const,
			members_count: membersCount ?? null,
			invite_code: board.inviteCode,
			can_edit: isOwner,
			can_delete: isOwner,
			created_at: board.createdAt.toISOString(),
			modified_at: board.updatedAt.toISOString(),
		};
	}
}

export const leaderboardService = new LeaderboardService();
