import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IOrgZodSchema } from '../zod';

export const OrgSchemaName = 'Org';

/** A team. Joining (with `inviteCode`) means agreeing to show your coding time on the org's dashboards. */
export const OrgSchema = new Schema<IOrgZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		ownerId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true, minLength: 1, maxLength: 80 },
		inviteCode: { type: SchemaTypes.String, required: true, unique: true },
	},
	{ timestamps: true, versionKey: false },
);
