import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateOrgSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ caller, params }) =>
	orgService.listOrgs(await requireSelf(params.user, caller)),
);

export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: CreateOrgSchema, status: 201 },
	async ({ caller, params, body }) => orgService.createOrg(await requireSelf(params.user, caller), body.name),
);
