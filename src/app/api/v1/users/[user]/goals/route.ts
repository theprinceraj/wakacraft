import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateGoalSchema } from '@/server/goal/goal.request.dto';
import { goalService } from '@/server/goal/goal.service';

export const GET = route(
	{ auth: 'required', scope: 'read_goals', params: UserParamSchema },
	async ({ caller, params }) => {
		const data = await goalService.list(await requireSelf(params.user, caller));
		return { data, total: data.length, total_pages: 1 };
	},
);

export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: CreateGoalSchema, status: 201 },
	async ({ caller, params, body }) => ({
		data: await goalService.create(await requireSelf(params.user, caller), body),
	}),
);
