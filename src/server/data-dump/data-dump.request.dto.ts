import { z } from 'zod';

import { DataDumpZodSchema } from '@/lib/mongo/zod';

export const CreateDataDumpSchema = z.object({
	type: DataDumpZodSchema.shape.type,
	/** Accepted for WakaTime compatibility; wakacraft dumps are ready immediately, so there is nothing to email. */
	email_when_finished: z.boolean().optional(),
});

export const DataDumpParamsSchema = z.object({ user: z.string(), id: DataDumpZodSchema.shape.id });
