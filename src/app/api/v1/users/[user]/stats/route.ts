import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { StatsSettingsQuerySchema } from '@/server/stats/stats.request.dto';
import { statsService } from '@/server/stats/stats.service';

/** Without a range, WakaTime returns the default range (last 7 days). */
export const GET = route(
	{ auth: 'required', params: UserParamSchema, query: StatsSettingsQuerySchema },
	async ({ caller, params, query }) =>
		statsService.getStats(await requireSelf(params.user, caller), 'last_7_days', query),
);
