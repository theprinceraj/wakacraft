import { requireSelf, route } from '@/lib/http/route';
import { OrgParamsSchema, UpdateOrgSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

export const GET = route(
	{ auth: 'required', scope: 'read_orgs', params: OrgParamsSchema },
	async ({ caller, params }) => orgService.getOrg(await requireSelf(params.user, caller), params.org),
);

export const PATCH = route(
	{ auth: 'session', params: OrgParamsSchema, body: UpdateOrgSchema },
	async ({ caller, params, body }) => orgService.updateOrg(await requireSelf(params.user, caller), params.org, body),
);

/** Owner: deletes the organization. Anyone else: leaves it. */
export const DELETE = route({ auth: 'session', params: OrgParamsSchema }, async ({ caller, params }) => ({
	data: { result: await orgService.leaveOrDelete(await requireSelf(params.user, caller), params.org) },
}));
