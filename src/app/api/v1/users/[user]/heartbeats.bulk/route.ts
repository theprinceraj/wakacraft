import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { BulkHeartbeatsRequestSchema, DeleteHeartbeatsRequestSchema } from '@/server/heartbeat/heartbeat.request.dto';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { rateLimitService } from '@/server/rate-limit/rate-limit.service';
import { statsService } from '@/server/stats/stats.service';

/** The endpoint wakatime-cli sends every heartbeat to. Responds `{ responses: [[body, status], …] }`. */
export const POST = route(
	{ auth: 'required', params: UserParamSchema, body: BulkHeartbeatsRequestSchema, status: 202 },
	async ({ request, caller, params, body }) => {
		const userId = await requireSelf(params.user, caller);
		// A 429 keeps the batch in wakatime-cli's offline queue, to be retried later.
		await rateLimitService.consume(userId, 'heartbeats', body.length);
		return {
			responses: await heartbeatService.ingest(userId, body, {
				userAgent: request.headers.get('user-agent'),
				machineName: request.headers.get('x-machine-name'),
			}),
		};
	},
);

export const DELETE = route(
	{ auth: 'required', params: UserParamSchema, body: DeleteHeartbeatsRequestSchema, status: 200 },
	async ({ caller, params, body }) => {
		const userId = await requireSelf(params.user, caller);
		const { timezone } = await statsService.resolveSettings(userId);
		await heartbeatService.deleteForDate(userId, body.date, timezone, body.ids);
		return {};
	},
);
