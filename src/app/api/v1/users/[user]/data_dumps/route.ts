import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateDataDumpSchema } from '@/server/data-dump/data-dump.request.dto';
import { toDataDumpResponse } from '@/server/data-dump/data-dump.response.dto';
import { dataDumpService } from '@/server/data-dump/data-dump.service';

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ request, caller, params }) => {
	const dumps = await dataDumpService.list(await requireSelf(params.user, caller));
	return { data: dumps.map((dump) => toDataDumpResponse(dump, request.nextUrl.origin)) };
});

export const POST = route(
	{ auth: 'required', params: UserParamSchema, body: CreateDataDumpSchema, status: 201 },
	async ({ request, caller, params, body }) => ({
		data: toDataDumpResponse(
			await dataDumpService.create(await requireSelf(params.user, caller), body.type),
			request.nextUrl.origin,
		),
	}),
);
