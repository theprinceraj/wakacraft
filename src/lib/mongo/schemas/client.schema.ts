import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IClientZodSchema } from '../zod';

export const ClientSchemaName = 'Client';

/** Someone the user bills: an hourly rate and the projects whose time is billed to them. */
export const ClientSchema = new Schema<IClientZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true, minLength: 1, maxLength: 120 },
		email: { type: SchemaTypes.String, required: false, maxLength: 254 },
		address: { type: SchemaTypes.String, required: false, maxLength: 500 },
		/** Major currency units per hour, e.g. 85.5. */
		hourlyRate: { type: SchemaTypes.Number, required: true, min: 0, max: 100_000 },
		/** ISO 4217, e.g. USD. */
		currency: { type: SchemaTypes.String, required: true, default: 'USD', minLength: 3, maxLength: 3 },
		/** Billable time per project is rounded up to this many minutes (0 = exact). */
		roundingMinutes: { type: SchemaTypes.Number, required: true, default: 0, min: 0, max: 60 },
		projects: { type: [SchemaTypes.String], required: true, default: [] },
	},
	{ timestamps: true, versionKey: false },
);

ClientSchema.index({ userId: 1, name: 1 });
