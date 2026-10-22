import { z } from 'zod';

export const MAX_IMPORT_BATCH = 1000;

/**
 * One batch of an import. The browser reads the export file and sends its heartbeats in batches (serverless
 * request bodies are capped at a few MB), passing the export's `user_agents` / `machines` lists along each time.
 * Heartbeats are validated individually by ingestion, so their shape is left open here.
 */
export const ImportBatchSchema = z.object({
	heartbeats: z.array(z.unknown()).min(1).max(MAX_IMPORT_BATCH),
	user_agents: z.array(z.unknown()).max(5000).optional(),
	machines: z.array(z.unknown()).max(5000).optional(),
});
