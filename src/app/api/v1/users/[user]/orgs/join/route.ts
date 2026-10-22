import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { JoinOrgSchema } from '@/server/org/org.request.dto';
import { orgService } from '@/server/org/org.service';

/** wakacraft extension: join an organization with its invite code. */
export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: JoinOrgSchema },
	async ({ caller, params, body }) => orgService.joinOrg(await requireSelf(params.user, caller), body.code),
);
