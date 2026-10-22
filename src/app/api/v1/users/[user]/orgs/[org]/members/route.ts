import { requireSelf, route } from '@/lib/http/route';
import { OrgParamsSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

export const GET = route({ auth: 'required', params: OrgParamsSchema }, async ({ caller, params }) =>
	orgService.listMembers(await requireSelf(params.user, caller), params.org),
);
