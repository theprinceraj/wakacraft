import { inBackground } from '@/lib/http/background';

import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { ReplaceRulesSchema } from '@/server/custom-rule/custom-rule.request.dto';
import { customRuleService } from '@/server/custom-rule/custom-rule.service';

/** Rewriting a large history can take a while; give the background job room on Vercel. */
export const maxDuration = 300;

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ caller, params }) =>
	customRuleService.list(await requireSelf(params.user, caller)),
);

/** Replaces the rule set and applies it to past heartbeats in the background; poll `custom_rules_progress`. */
export const PUT = route(
	{ auth: 'required', params: UserParamSchema, body: ReplaceRulesSchema },
	async ({ caller, params, body }) => {
		const { changes, job } = await customRuleService.replace(await requireSelf(params.user, caller), body);
		inBackground(() => customRuleService.applyToHistory(job));
		return { data: { changes, job_id: job.id } };
	},
);
