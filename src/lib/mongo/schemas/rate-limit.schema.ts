import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IRateLimitZodSchema } from '../zod';

export const RateLimitSchemaName = 'RateLimit';

/** One fixed-window counter: `key` is `<bucket>:<userId>:<window start>`. Mongo drops it once the window is over. */
export const RateLimitSchema = new Schema<IRateLimitZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		key: { type: SchemaTypes.String, required: true, unique: true },
		count: { type: SchemaTypes.Number, required: true, default: 0 },
		expiresAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
