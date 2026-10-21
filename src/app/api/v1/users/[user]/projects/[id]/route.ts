import { requireSelf, route } from '@/lib/http/route';
import { ProjectParamsSchema, UpdateProjectSchema } from '@/server/project/project.request.dto';
import { toProjectResponse } from '@/server/project/project.response.dto';
import { projectService } from '@/server/project/project.service';

export const PATCH = route(
	{ auth: 'session', params: ProjectParamsSchema, body: UpdateProjectSchema },
	async ({ caller, params, body }) => ({
		data: toProjectResponse(await projectService.update(await requireSelf(params.user, caller), params.id, body)),
	}),
);
