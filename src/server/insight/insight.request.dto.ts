import { z } from 'zod';

import { Weekdays } from '@/lib/util/Goals';
import { StatsRangePattern } from '@/server/stats/ranges';
import { StatsSettingsQuerySchema } from '@/server/stats/stats.request.dto';

/** WakaTime's insight types, plus wakacraft's `hours` (time of day). */
export const InsightTypes = [
	'stats',
	'weekdays',
	'days',
	'ai_days',
	'best_day',
	'daily_average',
	'projects',
	'languages',
	'editors',
	'categories',
	'machines',
	'operating_systems',
	'hours',
] as const;
export type InsightType = (typeof InsightTypes)[number];

export const InsightParamsSchema = z.object({
	user: z.string().min(1),
	insight_type: z.enum(InsightTypes),
	range: z.string().regex(StatsRangePattern, 'Unknown range'),
});

/** `weekday` (0–6 or a day name) narrows the `days` insight to one weekday. */
export const InsightQuerySchema = StatsSettingsQuerySchema.extend({
	weekday: z
		.union([
			z.coerce.number().int().min(0).max(6),
			z
				.string()
				.toLowerCase()
				.pipe(z.enum(Weekdays))
				.transform((day) => Weekdays.indexOf(day)),
		])
		.optional(),
});

export type InsightQuery = z.output<typeof InsightQuerySchema>;
