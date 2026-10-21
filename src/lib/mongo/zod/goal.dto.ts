/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const GoalZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	title: z.string().max(120).nullish(),
	delta: z.enum(['day', 'week']),
	seconds: z.number().gte(60).lte(604800),
	isInverse: z.boolean().default(false),
	projects: z.array(z.string()).default([]),
	languages: z.array(z.string()).default([]),
	editors: z.array(z.string()).default([]),
	categories: z.array(z.string()).default([]),
	ignoreDays: z.array(z.string()).default([]),
	ignoreZeroDays: z.boolean().default(false),
	isEnabled: z.boolean().default(true),
	snoozeUntil: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' })
		.nullish(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialGoalZodSchema = GoalZodSchema.partial();

export type IGoalZodSchema = TypeOf<typeof GoalZodSchema>;
export type IGoalZodSchemaInput = Omit<z.input<typeof GoalZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof GoalZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialGoalZodSchema = TypeOf<typeof PartialGoalZodSchema>;
