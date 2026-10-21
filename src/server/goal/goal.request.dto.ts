import { z } from 'zod';

import { GoalZodSchema } from '@/lib/mongo/zod';
import { Weekdays } from '@/lib/util/Goals';
import { CategoriesList } from '@/lib/util/Heartbeats';

const names = z.array(z.string().trim().min(1).max(256)).max(50);

const GoalFieldsSchema = GoalZodSchema.pick({
	delta: true,
	isInverse: true,
	ignoreZeroDays: true,
	isEnabled: true,
}).extend({
	/** `null` clears a custom title and falls back to the generated one. */
	title: z.string().trim().max(120).nullish(),
	seconds: z
		.int()
		.min(60)
		.max(7 * 86_400),
	projects: names.default([]),
	languages: names.default([]),
	editors: names.default([]),
	categories: z.array(z.enum(CategoriesList)).max(CategoriesList.length).default([]),
	ignoreDays: z.array(z.enum(Weekdays)).max(6).default([]),
	/** `null` un-snoozes. */
	snoozeUntil: z.iso.datetime({ offset: true }).pipe(z.coerce.date()).nullish(),
});

const DAILY_LIMIT = { message: 'A daily goal fits in 24 hours', path: ['seconds'] };

export const CreateGoalSchema = GoalFieldsSchema.strict().refine(
	(goal) => goal.delta === 'week' || goal.seconds <= 86_400,
	DAILY_LIMIT,
);
export type CreateGoalInput = z.output<typeof CreateGoalSchema>;

/** Partial update; the daily-limit check runs against the merged goal in the service. */
export const UpdateGoalSchema = GoalFieldsSchema.partial().strict();
export type UpdateGoalInput = z.output<typeof UpdateGoalSchema>;

export const GoalParamsSchema = z.object({ user: z.string(), goal: GoalZodSchema.shape.id });
