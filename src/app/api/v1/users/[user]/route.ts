import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { UpdateSettingsSchema } from '@/server/user/user.request.dto';
import { userService } from '@/server/user/user.service';

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ caller, params }) => ({
	data: await userService.getCurrentUser(await requireSelf(params.user, caller)),
}));

export const PATCH = route(
	{ auth: 'session', params: UserParamSchema, body: UpdateSettingsSchema },
	async ({ caller, params, body }) => ({
		data: await userService.updateSettings(await requireSelf(params.user, caller), body),
	}),
);
