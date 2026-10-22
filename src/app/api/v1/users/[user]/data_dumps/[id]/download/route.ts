import { requireSelf, route } from '@/lib/http/route';
import { DataDumpParamsSchema } from '@/server/data-dump/data-dump.request.dto';
import { dataDumpService } from '@/server/data-dump/data-dump.service';

/** Large histories stream for a while. */
export const maxDuration = 300;

export const GET = route({ auth: 'required', params: DataDumpParamsSchema }, async ({ caller, params }) => {
	const { dump, body } = await dataDumpService.open(await requireSelf(params.user, caller), params.id);
	const date = dump.createdAt.toISOString().slice(0, 10);
	return new Response(body, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="wakacraft-${dump.type}-${date}.json"`,
			'cache-control': 'no-store',
		},
	});
});
