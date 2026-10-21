/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const MachineZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string(),
	lastSeenAt: z
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
export const PartialMachineZodSchema = MachineZodSchema.partial();

export type IMachineZodSchema = TypeOf<typeof MachineZodSchema>;
export type IMachineZodSchemaInput = Omit<z.input<typeof MachineZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof MachineZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialMachineZodSchema = TypeOf<typeof PartialMachineZodSchema>;
