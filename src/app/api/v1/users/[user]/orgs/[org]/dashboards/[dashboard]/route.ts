import { requireSelf, route } from '@/lib/http/route';
import { DashboardParamsSchema, UpdateDashboardSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

export const GET = route({ auth: 'required', params: DashboardParamsSchema }, async ({ caller, params }) =>
	orgService.getDashboard(await requireSelf(params.user, caller), params.org, params.dashboard),
);

export const PATCH = route(
	{ auth: 'session', params: DashboardParamsSchema, body: UpdateDashboardSchema },
	async ({ caller, params, body }) =>
		orgService.updateDashboard(await requireSelf(params.user, caller), params.org, params.dashboard, body),
);

export const DELETE = route({ auth: 'session', params: DashboardParamsSchema }, async ({ caller, params }) => {
	await orgService.deleteDashboard(await requireSelf(params.user, caller), params.org, params.dashboard);
	return { data: { result: 'deleted' } };
});
