import { Schema, SchemaTypes } from 'mongoose';

import { createSubSchema, DEFAULT_TIMEOUT_MINUTES } from '../../util/Constants';
import { generateFlake } from '../../util/Snowflake';

import type { IUserProfileZodSchema } from '../zod';

export const UserProfileSchemaName = 'UserProfile';

const citySchema = createSubSchema({
	name: { type: SchemaTypes.String, required: true },
	state: { type: SchemaTypes.String, required: false },
	countryCode: { type: SchemaTypes.String, required: false, minLength: 2, maxLength: 2 },
});

/**
 * Product-side user data. Identity (email, name, password, OAuth accounts, sessions) lives in Better Auth's
 * own collections; this document is keyed by the Better Auth user id.
 */
export const UserProfileSchema = new Schema<IUserProfileZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true, unique: true, immutable: true },
		username: { type: SchemaTypes.String, required: false, lowercase: true, minLength: 2, maxLength: 39 },
		timezone: { type: SchemaTypes.String, required: true, default: 'UTC' },
		/** Keystroke timeout in minutes. */
		timeout: { type: SchemaTypes.Number, required: true, default: DEFAULT_TIMEOUT_MINUTES, min: 1, max: 120 },
		writesOnly: { type: SchemaTypes.Boolean, required: true, default: false },
		/** 0 = Sunday … 6 = Saturday. */
		weekStartDay: { type: SchemaTypes.Number, required: true, default: 1, min: 0, max: 6 },
		bio: { type: SchemaTypes.String, required: false, maxLength: 500 },
		website: { type: SchemaTypes.String, required: false },
		githubUsername: { type: SchemaTypes.String, required: false },
		twitterUsername: { type: SchemaTypes.String, required: false },
		linkedinUsername: { type: SchemaTypes.String, required: false },
		city: { type: citySchema, required: false },
		isHireable: { type: SchemaTypes.Boolean, required: true, default: false },
		isEmailPublic: { type: SchemaTypes.Boolean, required: true, default: false },
		isPhotoPublic: { type: SchemaTypes.Boolean, required: true, default: true },
		loggedTimePublic: { type: SchemaTypes.Boolean, required: true, default: false },
		languagesUsedPublic: { type: SchemaTypes.Boolean, required: true, default: false },
		editorsUsedPublic: { type: SchemaTypes.Boolean, required: true, default: false },
		categoriesUsedPublic: { type: SchemaTypes.Boolean, required: true, default: false },
		osUsedPublic: { type: SchemaTypes.Boolean, required: true, default: false },
		lastHeartbeatAt: { type: SchemaTypes.Date, required: false },
		lastPlugin: { type: SchemaTypes.String, required: false },
		lastProject: { type: SchemaTypes.String, required: false },
		lastBranch: { type: SchemaTypes.String, required: false },
	},
	{ timestamps: true, versionKey: false },
);

UserProfileSchema.index({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: 'string' } } });
