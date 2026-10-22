import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { FileExpertsSchema } from '@/server/meta/meta.request.dto';
import { metaService } from '@/server/meta/meta.service';

/** wakatime-cli `--file-experts`: who has worked on this file most, among you and your teammates. */
export const POST = route(
	{ auth: 'required', scope: 'read_heartbeats', params: UserParamSchema, body: FileExpertsSchema },
	async ({ caller, params, body }) => metaService.fileExperts(await requireSelf(params.user, caller), body),
);
