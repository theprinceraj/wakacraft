import { z } from 'zod';

import { ProjectZodSchema } from '@/lib/mongo/zod';

export const ListProjectsQuerySchema = z.object({ q: z.string().trim().max(200).optional() });

export const UpdateProjectSchema = ProjectZodSchema.pick({ color: true, repository: true, hasPublicUrl: true })
	.extend({
		color: z
			.string()
			.regex(/^#[\da-f]{6}$/i, 'Use a hex color like #4f46e5')
			.nullish(),
		repository: z.url().max(512).nullish(),
	})
	.partial()
	.strict();

export type UpdateProjectInput = z.output<typeof UpdateProjectSchema>;

export const ProjectParamsSchema = z.object({ user: z.string(), id: ProjectZodSchema.shape.id });
