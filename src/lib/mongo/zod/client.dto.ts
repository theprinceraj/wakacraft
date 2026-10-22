/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const ClientZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string().min(1).max(120),
	email: z.string().max(254).nullish(),
	address: z.string().max(500).nullish(),
	hourlyRate: z.number().gte(0).lte(100000),
	currency: z.string().min(3).max(3).default('USD'),
	roundingMinutes: z.number().gte(0).lte(60).default(0),
	projects: z.array(z.string()).default([]),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialClientZodSchema = ClientZodSchema.partial();

export type IClientZodSchema = TypeOf<typeof ClientZodSchema>;
export type IClientZodSchemaInput = Omit<z.input<typeof ClientZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof ClientZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialClientZodSchema = TypeOf<typeof PartialClientZodSchema>;
