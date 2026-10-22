import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { ILeaderboardZodSchema } from '../zod';

export const LeaderboardSchemaName = 'Leaderboard';

/** A private leaderboard. Members join with `inviteCode`; joining means agreeing to show your time to members. */
export const LeaderboardSchema = new Schema<ILeaderboardZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		ownerId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true, minLength: 1, maxLength: 80 },
		inviteCode: { type: SchemaTypes.String, required: true, unique: true },
	},
	{ timestamps: true, versionKey: false },
);
