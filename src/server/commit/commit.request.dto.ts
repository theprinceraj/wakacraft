import { z } from 'zod';

export const CommitsQuerySchema = z.object({
	branch: z.string().trim().min(1).max(255).optional(),
	page: z.coerce.number().int().min(1).max(1000).default(1),
});

export type CommitsQuery = z.output<typeof CommitsQuerySchema>;

/** WakaTime's `:project` is the project name; it shares the `[id]` segment with project updates. */
export const CommitsParamsSchema = z.object({ user: z.string().min(1), id: z.string().min(1).max(512) });
