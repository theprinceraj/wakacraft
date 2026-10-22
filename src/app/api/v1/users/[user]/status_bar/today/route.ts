import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { statsService } from '@/server/stats/stats.service';

export const GET = route(
	{ auth: 'required', scope: 'read_summaries', params: UserParamSchema },
	async ({ caller, params }) => statsService.getStatusBarToday(await requireSelf(params.user, caller)),
);
