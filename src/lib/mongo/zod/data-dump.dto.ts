/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const DataDumpZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	type: z.enum(['heartbeats', 'daily']),
	expiresAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialDataDumpZodSchema = DataDumpZodSchema.partial();

export type IDataDumpZodSchema = TypeOf<typeof DataDumpZodSchema>;
export type IDataDumpZodSchemaInput = Omit<z.input<typeof DataDumpZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof DataDumpZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialDataDumpZodSchema = TypeOf<typeof PartialDataDumpZodSchema>;
