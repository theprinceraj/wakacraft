import { z } from 'zod';

import { HeartbeatZodSchema } from '@/lib/mongo/zod';

/** wakatime-cli's file experts request body. */
export const FileExpertsSchema = z.object({
	entity: HeartbeatZodSchema.shape.entity.min(1).max(2048),
	project: z.string().min(1).max(512),
	project_root_count: z.number().int().min(0).optional(),
});

export type FileExpertsInput = z.output<typeof FileExpertsSchema>;
