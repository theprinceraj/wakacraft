import { requireSelf, route } from '@/lib/http/route';
import { GoalParamsSchema, UpdateGoalSchema } from '@/server/goal/goal.request.dto';
import { goalService } from '@/server/goal/goal.service';

export const GET = route({ auth: 'required', params: GoalParamsSchema }, async ({ caller, params }) => ({
	data: await goalService.get(await requireSelf(params.user, caller), params.goal),
}));

export const PATCH = route(
	{ auth: 'session', params: GoalParamsSchema, body: UpdateGoalSchema },
	async ({ caller, params, body }) => ({
		data: await goalService.update(await requireSelf(params.user, caller), params.goal, body),
	}),
);

export const DELETE = route({ auth: 'session', params: GoalParamsSchema }, async ({ caller, params }) => {
	await goalService.remove(await requireSelf(params.user, caller), params.goal);
});
