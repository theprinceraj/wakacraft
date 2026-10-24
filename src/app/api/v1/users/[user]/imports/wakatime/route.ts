import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { StartWakatimeImportSchema } from '@/server/wakatime-import/wakatime-import.request.dto';
import { wakatimeImportService } from '@/server/wakatime-import/wakatime-import.service';

/** Each call may continue the import in the background for up to ~45s. */
export const maxDuration = 60;

/** wakacraft extension: the latest import from wakatime.com (polling it also keeps the import moving). */
export const GET = route({ auth: 'session', params: UserParamSchema }, async ({ caller, params }) =>
	wakatimeImportService.getStatus(await requireSelf(params.user, caller)),
);

export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: StartWakatimeImportSchema, status: 201 },
	async ({ caller, params, body }) => wakatimeImportService.start(await requireSelf(params.user, caller), body.token),
);

export const DELETE = route({ auth: 'session', params: UserParamSchema }, async ({ caller, params }) =>
	wakatimeImportService.cancel(await requireSelf(params.user, caller)),
);
