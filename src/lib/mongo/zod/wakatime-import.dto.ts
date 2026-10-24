/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const WakatimeImportZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	status: z.enum(['running', 'done', 'failed', 'cancelled']),
	token: z.string().nullish(),
	startDate: z.string(),
	endDate: z.string(),
	cursor: z.string(),
	daysDone: z.number().default(0),
	daysTotal: z.number(),
	heartbeatsImported: z.number().default(0),
	userAgents: z.array(z.object({ id: z.string(), value: z.string() })).default([]),
	machines: z.array(z.object({ id: z.string(), value: z.string() })).default([]),
	leaseUntil: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' })
		.nullish(),
	retryAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' })
		.nullish(),
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
export const PartialWakatimeImportZodSchema = WakatimeImportZodSchema.partial();

export type IWakatimeImportZodSchema = TypeOf<typeof WakatimeImportZodSchema>;
export type IWakatimeImportZodSchemaInput = Omit<z.input<typeof WakatimeImportZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof WakatimeImportZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialWakatimeImportZodSchema = TypeOf<typeof PartialWakatimeImportZodSchema>;
