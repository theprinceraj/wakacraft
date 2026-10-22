import { requireSelf, route } from '@/lib/http/route';
import { DashboardMemberParamsSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';
import { DurationsQuerySchema } from '@/server/stats/stats.request.dto';

export const GET = route(
	{ auth: 'required', scope: 'read_orgs', params: DashboardMemberParamsSchema, query: DurationsQuerySchema },
	async ({ caller, params, query }) =>
		orgService.memberDurations(
			await requireSelf(params.user, caller),
			params.org,
			params.dashboard,
			params.member,
			query,
		),
);
