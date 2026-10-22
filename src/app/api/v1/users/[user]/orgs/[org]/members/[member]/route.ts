import { requireSelf, route } from '@/lib/http/route';
import { OrgMemberParamsSchema, UpdateMemberSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

export const PATCH = route(
	{ auth: 'session', params: OrgMemberParamsSchema, body: UpdateMemberSchema },
	async ({ caller, params, body }) =>
		orgService.updateMemberRole(await requireSelf(params.user, caller), params.org, params.member, body.role),
);

export const DELETE = route({ auth: 'session', params: OrgMemberParamsSchema }, async ({ caller, params }) => {
	await orgService.removeMember(await requireSelf(params.user, caller), params.org, params.member);
	return { data: { result: 'removed' } };
});
