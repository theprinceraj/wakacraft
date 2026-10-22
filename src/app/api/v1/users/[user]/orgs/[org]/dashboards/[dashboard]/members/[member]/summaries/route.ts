import { requireSelf, route } from '@/lib/http/route';
import { DashboardMemberParamsSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';
import { SummariesQuerySchema } from '@/server/stats/stats.request.dto';

export const GET = route(
	{ auth: 'required', scope: 'read_orgs', params: DashboardMemberParamsSchema, query: SummariesQuerySchema },
	async ({ caller, params, query }) =>
		orgService.memberSummaries(
			await requireSelf(params.user, caller),
			params.org,
			params.dashboard,
			params.member,
			query,
		),
);
