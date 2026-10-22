/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const RuleJobZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	status: z.enum(['running', 'done', 'failed']),
	progress: z.number().gte(0).lte(100).default(0),
	changedHeartbeats: z.number().default(0),
	deletedHeartbeats: z.number().default(0),
	error: z.string().nullish(),
	finishedAt: z
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
export const PartialRuleJobZodSchema = RuleJobZodSchema.partial();

export type IRuleJobZodSchema = TypeOf<typeof RuleJobZodSchema>;
export type IRuleJobZodSchemaInput = Omit<z.input<typeof RuleJobZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof RuleJobZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialRuleJobZodSchema = TypeOf<typeof PartialRuleJobZodSchema>;
