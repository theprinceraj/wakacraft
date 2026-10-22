import { z } from 'zod';

import { route } from '@/lib/http/route';
import { GLOBAL_RANGES, globalStatsService, type GlobalRange } from '@/server/global-stats/global-stats.service';

const ParamsSchema = z.object({ range: z.enum(Object.keys(GLOBAL_RANGES) as [GlobalRange, ...GlobalRange[]]) });

/** WakaTime's `GET /stats/:range`: site-wide totals across users who made their coding time public. */
export const GET = route({ auth: 'none', params: ParamsSchema }, async ({ params }) =>
	globalStatsService.getStats(params.range),
);
