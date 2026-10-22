import { requireSelf, route } from '@/lib/http/route';
import { DashboardParamsSchema, TeamSummariesQuerySchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

/** The dashboard's whole team, summed per day, with each member's total for the range. */
export const GET = route(
	{ auth: 'required', params: DashboardParamsSchema, query: TeamSummariesQuerySchema },
	async ({ caller, params, query }) =>
		orgService.teamSummaries(await requireSelf(params.user, caller), params.org, params.dashboard, query),
);
