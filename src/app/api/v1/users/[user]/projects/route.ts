import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { ListProjectsQuerySchema } from '@/server/project/project.request.dto';
import { toProjectResponse } from '@/server/project/project.response.dto';
import { projectService } from '@/server/project/project.service';

export const GET = route(
	{ auth: 'required', params: UserParamSchema, query: ListProjectsQuerySchema },
	async ({ caller, params, query }) => ({
		data: (await projectService.list(await requireSelf(params.user, caller), query.q)).map(toProjectResponse),
	}),
);
