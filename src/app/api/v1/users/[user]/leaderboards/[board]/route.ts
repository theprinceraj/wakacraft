import { requireSelf, route } from '@/lib/http/route';
import { BoardParamsSchema, LeadersQuerySchema } from '@/server/leaderboard/leaderboard.request.dto';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';

export const GET = route(
	{ auth: 'required', params: BoardParamsSchema, query: LeadersQuerySchema },
	async ({ caller, params, query }) =>
		leaderboardService.boardLeaders(await requireSelf(params.user, caller), params.board, query),
);

/** Owner: deletes the board. Member: leaves it. */
export const DELETE = route({ auth: 'session', params: BoardParamsSchema }, async ({ caller, params }) => ({
	data: { result: await leaderboardService.leaveOrDelete(await requireSelf(params.user, caller), params.board) },
}));
