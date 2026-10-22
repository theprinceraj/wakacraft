import { resolveUser, route, UserParamSchema } from '@/lib/http/route';
import { StatsSettingsQuerySchema } from '@/server/stats/stats.request.dto';
import { statsService } from '@/server/stats/stats.service';
import { publicProfileService } from '@/server/user/public-profile.service';

/** Without a range, WakaTime returns the default range (last 7 days). */
export const GET = route(
	{ auth: 'optional', params: UserParamSchema, query: StatsSettingsQuerySchema },
	async ({ caller, params, query }) => {
		const target = await resolveUser(params.user, caller);
		return target.isSelf
			? statsService.getStats(target.userId, 'last_7_days', query)
			: publicProfileService.getPublicStats(target.userId, 'last_7_days', query);
	},
);
