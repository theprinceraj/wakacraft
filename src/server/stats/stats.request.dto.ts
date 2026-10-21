import { z } from 'zod';

import { SliceByList } from '@/lib/util/Heartbeats';
import { isValidTimezone } from '@/lib/util/Time';

import { StatsRangePattern, SummaryRangeNames } from './ranges';

/** Accepts `2026-10-22` or a full ISO timestamp (WakaTime clients send both) and keeps the date part. */
const dateParam = z.preprocess(
	(value) => (typeof value === 'string' && value.length > 10 ? value.slice(0, 10) : value),
	z.iso.date(),
);

const commaList = z
	.string()
	.transform((value) =>
		value
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean),
	)
	.optional();

/** Per-request overrides of the user's own settings, shared by every stats endpoint. */
export const StatsSettingsQuerySchema = z.object({
	timeout: z.coerce.number().int().min(1).max(120).optional(),
	writes_only: z.stringbool().optional(),
	timezone: z.string().refine(isValidTimezone, 'Unknown timezone').optional(),
});

export const MAX_SUMMARY_DAYS = 400;

export const SummariesQuerySchema = StatsSettingsQuerySchema.extend({
	start: dateParam.optional(),
	end: dateParam.optional(),
	range: z.enum(SummaryRangeNames).optional(),
	project: z.string().min(1).optional(),
	branches: commaList,
})
	.refine((query) => query.range || (query.start && query.end), {
		message: 'Provide start and end dates, or a range',
		path: ['start'],
	})
	.refine((query) => !query.start || !query.end || query.start <= query.end, {
		message: 'start must not be after end',
		path: ['end'],
	})
	.refine(
		(query) =>
			!query.start || !query.end || (Date.parse(query.end) - Date.parse(query.start)) / 86_400_000 < MAX_SUMMARY_DAYS,
		{ message: `A summaries request can span at most ${MAX_SUMMARY_DAYS} days`, path: ['end'] },
	);

export type SummariesQuery = z.output<typeof SummariesQuerySchema>;

export const DurationsQuerySchema = StatsSettingsQuerySchema.extend({
	date: dateParam,
	project: z.string().min(1).optional(),
	branches: commaList,
	slice_by: z.enum(SliceByList).default('project'),
});

export type DurationsQuery = z.output<typeof DurationsQuerySchema>;

export const StatsParamsSchema = z.object({
	user: z.string().min(1),
	range: z.string().regex(StatsRangePattern, 'Unknown range'),
});

export const AllTimeQuerySchema = z.object({ project: z.string().min(1).optional() });

export type StatsSettingsQuery = z.output<typeof StatsSettingsQuerySchema>;
