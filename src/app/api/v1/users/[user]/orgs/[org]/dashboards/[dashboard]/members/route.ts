import { requireSelf, route } from '@/lib/http/route';
import { DashboardParamsSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

export const GET = route({ auth: 'required', params: DashboardParamsSchema }, async ({ caller, params }) =>
	orgService.dashboardMembers(await requireSelf(params.user, caller), params.org, params.dashboard),
);
