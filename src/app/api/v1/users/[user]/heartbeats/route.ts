import { NextResponse } from 'next/server';

import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { DateQuerySchema } from '@/server/heartbeat/heartbeat.request.dto';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { rateLimitService } from '@/server/rate-limit/rate-limit.service';
import { statsService } from '@/server/stats/stats.service';

export const GET = route(
	{ auth: 'required', params: UserParamSchema, query: DateQuerySchema },
	async ({ caller, params, query }) => {
		const userId = await requireSelf(params.user, caller);
		const { timezone } = await statsService.resolveSettings(userId);
		return { data: await heartbeatService.listForDate(userId, query.date, timezone), timezone };
	},
);

/** Single heartbeat. wakatime-cli always uses the bulk endpoint; this exists for other WakaTime clients. */
export const POST = route({ auth: 'required', params: UserParamSchema }, async ({ request, caller, params }) => {
	const userId = await requireSelf(params.user, caller);
	await rateLimitService.consume(userId, 'heartbeats');
	const body: unknown = await request.json().catch(() => null);
	const [[result, status]] = await heartbeatService.ingest(userId, [body], {
		userAgent: request.headers.get('user-agent'),
		machineName: request.headers.get('x-machine-name'),
	});
	return NextResponse.json(result, { status: status === 201 ? 202 : status });
});
