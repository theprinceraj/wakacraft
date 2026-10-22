import { z } from 'zod';

/** A WakaTime secret API key (`waka_…`, or a bare UUID on older accounts). */
export const StartWakatimeImportSchema = z.object({ api_key: z.string().trim().min(20).max(100) });
