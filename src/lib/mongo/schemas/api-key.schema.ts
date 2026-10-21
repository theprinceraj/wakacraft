import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IApiKeyZodSchema } from '../zod';

export const ApiKeySchemaName = 'ApiKey';

/** A plugin API key (`waka_<uuid>`). Only its SHA-256 is stored; the plaintext is shown once on creation. */
export const ApiKeySchema = new Schema<IApiKeyZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true, maxLength: 100 },
		keyHash: { type: SchemaTypes.String, required: true, unique: true, select: false },
		/** Last 4 characters, so the settings page can tell keys apart. */
		keyPreview: { type: SchemaTypes.String, required: true },
		lastUsedAt: { type: SchemaTypes.Date, required: false },
	},
	{ timestamps: true, versionKey: false },
);

ApiKeySchema.index({ userId: 1 });
