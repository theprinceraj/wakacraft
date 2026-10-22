import { z } from 'zod';

import { route } from '@/lib/http/route';
import { shareableService } from '@/server/shareable/shareable.service';

const ParamsSchema = z.object({
	user: z.string().min(1),
	// Accept an optional `.svg` suffix so the URL reads naturally in markdown.
	project: z
		.string()
		.min(1)
		.transform((project) => decodeURIComponent(project).replace(/\.svg$/, '')),
});

/** README badge: `![wakacraft](…/users/<username>/badges/projects/<project>.svg)`. Public projects only. */
export const GET = route(
	{ auth: 'none', params: ParamsSchema },
	async ({ params }) =>
		new Response(await shareableService.projectBadge(params.user, params.project), {
			headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=600' },
		}),
);
