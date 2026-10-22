import { requireSelf, route } from '@/lib/http/route';
import { CommitsParamsSchema, CommitsQuerySchema } from '@/server/commit/commit.request.dto';
import { commitService } from '@/server/commit/commit.service';

/** WakaTime's `projects/:project/commits`: GitHub commits with the coding time that went into each. */
export const GET = route(
	{ auth: 'required', scope: 'read_summaries', params: CommitsParamsSchema, query: CommitsQuerySchema },
	async ({ caller, params, query }) =>
		commitService.getCommits(await requireSelf(params.user, caller), params.id, query),
);
