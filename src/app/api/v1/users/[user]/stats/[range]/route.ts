import { requireSelf, route } from '@/lib/http/route';
import { StatsParamsSchema, StatsSettingsQuerySchema } from '@/server/stats/stats.request.dto';
import { statsService } from '@/server/stats/stats.service';

export const GET = route(
	{ auth: 'required', params: StatsParamsSchema, query: StatsSettingsQuerySchema },
	async ({ caller, params, query }) =>
		statsService.getStats(await requireSelf(params.user, caller), params.range, query),
);
