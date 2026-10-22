import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { RuleProgressQuerySchema } from '@/server/custom-rule/custom-rule.request.dto';
import { customRuleService } from '@/server/custom-rule/custom-rule.service';

export const GET = route(
	{ auth: 'required', params: UserParamSchema, query: RuleProgressQuerySchema },
	async ({ caller, params, query }) => customRuleService.progress(await requireSelf(params.user, caller), query.job_id),
);
