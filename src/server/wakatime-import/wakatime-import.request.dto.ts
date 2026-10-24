import { z } from 'zod';

/** A WakaTime personal OAuth token, from wakatime.com/oauth. */
export const StartWakatimeImportSchema = z.object({ token: z.string().trim().min(20).max(200) });
