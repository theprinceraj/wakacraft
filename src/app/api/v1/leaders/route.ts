import { route } from '@/lib/http/route';
import { LeadersQuerySchema } from '@/server/leaderboard/leaderboard.request.dto';
import { leaderboardService } from '@/server/leaderboard/leaderboard.service';

/** The public leaderboard (WakaTime `GET /leaders`): users who made their coding time public, last 7 days. */
export const GET = route({ auth: 'none', query: LeadersQuerySchema }, async ({ query }) =>
	leaderboardService.publicLeaders(query),
);
