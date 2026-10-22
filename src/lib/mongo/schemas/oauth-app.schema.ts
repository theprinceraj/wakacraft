import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IOAuthAppZodSchema } from '../zod';

export const OAuthAppSchemaName = 'OAuthApp';

/** A third-party application a user registered to request access to wakacraft accounts. */
export const OAuthAppSchema = new Schema<IOAuthAppZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		ownerId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true, minLength: 1, maxLength: 80 },
		description: { type: SchemaTypes.String, required: false, maxLength: 500 },
		website: { type: SchemaTypes.String, required: false },
		/** Exact-match redirect URIs; an authorization request must use one of these. */
		redirectUris: { type: [SchemaTypes.String], required: true },
		clientId: { type: SchemaTypes.String, required: true, unique: true, immutable: true },
		/** SHA-256 of the client secret, which is shown once. */
		clientSecretHash: { type: SchemaTypes.String, required: true, select: false },
	},
	{ timestamps: true, versionKey: false },
);

OAuthAppSchema.index({ ownerId: 1 });
