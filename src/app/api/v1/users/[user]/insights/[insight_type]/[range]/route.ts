import { requireSelf, route } from '@/lib/http/route';
import { InsightParamsSchema, InsightQuerySchema } from '@/server/insight/insight.request.dto';
import { insightService } from '@/server/insight/insight.service';

export const GET = route(
	{ auth: 'required', params: InsightParamsSchema, query: InsightQuerySchema },
	async ({ caller, params, query }) =>
		insightService.getInsight(await requireSelf(params.user, caller), params.insight_type, params.range, query),
);
