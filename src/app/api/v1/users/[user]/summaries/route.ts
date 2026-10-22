import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { SummariesQuerySchema } from '@/server/stats/stats.request.dto';
import { statsService } from '@/server/stats/stats.service';

export const GET = route(
	{ auth: 'required', scope: 'read_summaries', params: UserParamSchema, query: SummariesQuerySchema },
	async ({ caller, params, query }) => statsService.getSummaries(await requireSelf(params.user, caller), query),
);
