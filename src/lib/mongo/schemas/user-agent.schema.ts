import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IUserAgentZodSchema } from '../zod';

export const UserAgentSchemaName = 'UserAgent';

/** A distinct plugin user-agent string seen for a user, parsed into editor / OS. */
export const UserAgentSchema = new Schema<IUserAgentZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		value: { type: SchemaTypes.String, required: true },
		editor: { type: SchemaTypes.String, required: false },
		version: { type: SchemaTypes.String, required: false },
		os: { type: SchemaTypes.String, required: false },
		isBrowserExtension: { type: SchemaTypes.Boolean, required: true, default: false },
		isDesktopApp: { type: SchemaTypes.Boolean, required: true, default: false },
		lastSeenAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);

UserAgentSchema.index({ userId: 1, value: 1 }, { unique: true });
