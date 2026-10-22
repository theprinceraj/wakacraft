import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { AllTimeQuerySchema } from '@/server/stats/stats.request.dto';
import { statsService } from '@/server/stats/stats.service';

export const GET = route(
	{ auth: 'required', scope: 'read_stats', params: UserParamSchema, query: AllTimeQuerySchema },
	async ({ caller, params, query }) =>
		statsService.getAllTimeSinceToday(await requireSelf(params.user, caller), query.project),
);
