import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IMachineZodSchema } from '../zod';

export const MachineSchemaName = 'Machine';

/** A hostname reported via the `X-Machine-Name` header. */
export const MachineSchema = new Schema<IMachineZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true },
		lastSeenAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);

MachineSchema.index({ userId: 1, name: 1 }, { unique: true });
