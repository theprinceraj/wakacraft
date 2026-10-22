import { resolveUser, route } from '@/lib/http/route';
import { StatsParamsSchema, StatsSettingsQuerySchema } from '@/server/stats/stats.request.dto';
import { statsService } from '@/server/stats/stats.service';
import { publicProfileService } from '@/server/user/public-profile.service';

/** Your own stats, or another user's public stats (if they made them public). */
export const GET = route(
	{ auth: 'optional', params: StatsParamsSchema, query: StatsSettingsQuerySchema },
	async ({ caller, params, query }) => {
		const target = await resolveUser(params.user, caller);
		return target.isSelf
			? statsService.getStats(target.userId, params.range, query)
			: publicProfileService.getPublicStats(target.userId, params.range, query);
	},
);
