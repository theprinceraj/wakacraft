import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateLeaderboardSchema } from '@/server/leaderboard/leaderboard.request.dto';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';

export const GET = route(
	{ auth: 'required', scope: 'read_private_leaderboards', params: UserParamSchema },
	async ({ caller, params }) => leaderboardService.listBoards(await requireSelf(params.user, caller)),
);

export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: CreateLeaderboardSchema, status: 201 },
	async ({ caller, params, body }) => leaderboardService.createBoard(await requireSelf(params.user, caller), body.name),
);
