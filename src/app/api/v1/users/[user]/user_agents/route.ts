import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { toUserAgentResponse } from '@/server/user-agent/user-agent.response.dto';
import { userAgentService } from '@/server/user-agent/user-agent.service';

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ caller, params }) => ({
	data: (await userAgentService.list(await requireSelf(params.user, caller))).map(toUserAgentResponse),
}));
