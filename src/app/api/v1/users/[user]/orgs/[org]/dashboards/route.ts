import { requireSelf, route } from '@/lib/http/route';
import { DashboardBodySchema, OrgParamsSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

export const GET = route({ auth: 'required', params: OrgParamsSchema }, async ({ caller, params }) =>
	orgService.listDashboards(await requireSelf(params.user, caller), params.org),
);

export const POST = route(
	{ auth: 'session', params: OrgParamsSchema, body: DashboardBodySchema, status: 201 },
	async ({ caller, params, body }) =>
		orgService.createDashboard(await requireSelf(params.user, caller), params.org, body),
);
