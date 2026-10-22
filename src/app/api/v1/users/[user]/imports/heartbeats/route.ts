import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { ImportBatchSchema } from '@/server/import/import.request.dto';
import { importService } from '@/server/import/import.service';

/** wakacraft extension: import one batch of heartbeats from a WakaTime or wakacraft heartbeats export. */
export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: ImportBatchSchema },
	async ({ caller, params, body }) => importService.importBatch(await requireSelf(params.user, caller), body),
);
