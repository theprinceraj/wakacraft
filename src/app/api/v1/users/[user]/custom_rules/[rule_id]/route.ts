import { inBackground } from '@/lib/http/background';

import { requireSelf, route } from '@/lib/http/route';
import { RuleParamsSchema } from '@/server/custom-rule/custom-rule.request.dto';
import { customRuleService } from '@/server/custom-rule/custom-rule.service';

export const maxDuration = 300;

export const DELETE = route({ auth: 'required', params: RuleParamsSchema }, async ({ caller, params }) => {
	const job = await customRuleService.remove(await requireSelf(params.user, caller), params.rule_id);
	inBackground(() => customRuleService.applyToHistory(job));
	return { data: { job_id: job.id } };
});
