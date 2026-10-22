import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { DurationsQuerySchema } from '@/server/stats/stats.request.dto';
import { statsService } from '@/server/stats/stats.service';

export const GET = route(
	{ auth: 'required', scope: 'read_heartbeats', params: UserParamSchema, query: DurationsQuerySchema },
	async ({ caller, params, query }) => statsService.getDurations(await requireSelf(params.user, caller), query),
);
