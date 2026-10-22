/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const CustomRuleZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	action: z.enum(['change', 'delete']),
	source: z.enum(['project', 'entity', 'language', 'branch', 'category', 'editor', 'operating_system', 'machine']),
	operation: z.enum(['equals', 'contains', 'starts with', 'ends with']),
	sourceValue: z.string().min(1).max(512),
	destinations: z
		.array(
			z.object({
				id: z.string(),
				destination: z.enum([
					'project',
					'entity',
					'language',
					'branch',
					'category',
					'editor',
					'operating_system',
					'machine',
				]),
				destinationValue: z.string().max(512),
			}),
		)
		.default([]),
	priority: z.number().gte(1),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialCustomRuleZodSchema = CustomRuleZodSchema.partial();

export type ICustomRuleZodSchema = TypeOf<typeof CustomRuleZodSchema>;
export type ICustomRuleZodSchemaInput = Omit<z.input<typeof CustomRuleZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof CustomRuleZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialCustomRuleZodSchema = TypeOf<typeof PartialCustomRuleZodSchema>;
