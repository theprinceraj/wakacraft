import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IOAuthCodeZodSchema } from '../zod';

export const OAuthCodeSchemaName = 'OAuthCode';

/** A one-time authorization code, exchanged at the token endpoint. Mongo drops it once expired. */
export const OAuthCodeSchema = new Schema<IOAuthCodeZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		/** SHA-256 of the code. */
		codeHash: { type: SchemaTypes.String, required: true, unique: true },
		appId: { type: SchemaTypes.String, required: true },
		userId: { type: SchemaTypes.String, required: true },
		scopes: { type: [SchemaTypes.String], required: true },
		redirectUri: { type: SchemaTypes.String, required: true },
		/** PKCE (RFC 7636), for clients that can't keep a secret. */
		codeChallenge: { type: SchemaTypes.String, required: false },
		codeChallengeMethod: { type: SchemaTypes.String, enum: ['S256', 'plain'], required: false },
		expiresAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);

OAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
