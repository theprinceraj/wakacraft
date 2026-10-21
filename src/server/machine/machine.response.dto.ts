import { z } from 'zod';

import { MachineZodSchema, type IMachineZodSchema } from '@/lib/mongo/zod';

export const MachineResponseSchema = z.object({
	id: MachineZodSchema.shape.id,
	name: MachineZodSchema.shape.name,
	value: MachineZodSchema.shape.name,
	last_seen_at: z.iso.datetime(),
	created_at: z.iso.datetime(),
});

export type MachineResponse = z.infer<typeof MachineResponseSchema>;

export const toMachineResponse = (machine: IMachineZodSchema): MachineResponse => ({
	id: machine.id,
	name: machine.name,
	value: machine.name,
	last_seen_at: machine.lastSeenAt.toISOString(),
	created_at: machine.createdAt.toISOString(),
});
