import { NextResponse } from 'next/server';

import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { ExternalDurationsQuerySchema } from '@/server/external-duration/external-duration.request.dto';
import { externalDurationService } from '@/server/external-duration/external-duration.service';

export const GET = route(
	{ auth: 'required', params: UserParamSchema, query: ExternalDurationsQuerySchema },
	async ({ caller, params, query }) =>
		externalDurationService.listForDate(await requireSelf(params.user, caller), query),
);

/** One external duration (meeting, calendar event, …). Re-sending the same `external_id` updates it. */
export const POST = route({ auth: 'required', params: UserParamSchema }, async ({ request, caller, params }) => {
	const body: unknown = await request.json().catch(() => null);
	const [[result, status]] = await externalDurationService.upsertMany(await requireSelf(params.user, caller), [body]);
	return NextResponse.json(result, { status });
});
