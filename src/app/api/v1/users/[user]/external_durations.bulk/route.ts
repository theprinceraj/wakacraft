import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import {
	BulkExternalDurationsSchema,
	DeleteExternalDurationsSchema,
} from '@/server/external-duration/external-duration.request.dto';
import { externalDurationService } from '@/server/external-duration/external-duration.service';

/** Up to 1,000 external durations; per-item results like the heartbeats bulk endpoint, plus WakaTime's `status_codes`. */
export const POST = route(
	{
		auth: 'required',
		scope: 'write_heartbeats',
		params: UserParamSchema,
		body: BulkExternalDurationsSchema,
		status: 201,
	},
	async ({ caller, params, body }) => {
		const responses = await externalDurationService.upsertMany(await requireSelf(params.user, caller), body);
		return { responses, status_codes: responses.map(([, status]) => status) };
	},
);

export const DELETE = route(
	{
		auth: 'required',
		scope: 'write_heartbeats',
		params: UserParamSchema,
		body: DeleteExternalDurationsSchema,
		status: 200,
	},
	async ({ caller, params, body }) => {
		await externalDurationService.deleteForDate(await requireSelf(params.user, caller), body.date, body.ids);
		return {};
	},
);
