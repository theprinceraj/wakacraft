import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IOAuthTokenZodSchema } from '../zod';

export const OAuthTokenSchemaName = 'OAuthToken';

/** An access/refresh token pair an app holds for a user. Only hashes are stored. */
export const OAuthTokenSchema = new Schema<IOAuthTokenZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		appId: { type: SchemaTypes.String, required: true },
		userId: { type: SchemaTypes.String, required: true },
		scopes: { type: [SchemaTypes.String], required: true },
		accessTokenHash: { type: SchemaTypes.String, required: true, unique: true },
		refreshTokenHash: { type: SchemaTypes.String, required: true, unique: true },
		accessExpiresAt: { type: SchemaTypes.Date, required: true },
		lastUsedAt: { type: SchemaTypes.Date, required: false },
	},
	{ timestamps: true, versionKey: false },
);

OAuthTokenSchema.index({ userId: 1, appId: 1 });
OAuthTokenSchema.index({ appId: 1 });
