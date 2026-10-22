import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { JoinLeaderboardSchema } from '@/server/leaderboard/leaderboard.request.dto';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';

/** wakacraft extension: join a private leaderboard with its invite code. */
export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: JoinLeaderboardSchema },
	async ({ caller, params, body }) => leaderboardService.joinBoard(await requireSelf(params.user, caller), body.code),
);
