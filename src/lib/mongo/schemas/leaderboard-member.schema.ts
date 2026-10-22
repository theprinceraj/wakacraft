import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { ILeaderboardMemberZodSchema } from '../zod';

export const LeaderboardMemberSchemaName = 'LeaderboardMember';

export const LeaderboardMemberSchema = new Schema<ILeaderboardMemberZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		leaderboardId: { type: SchemaTypes.String, required: true },
		userId: { type: SchemaTypes.String, required: true },
	},
	{ timestamps: true, versionKey: false },
);

LeaderboardMemberSchema.index({ leaderboardId: 1, userId: 1 }, { unique: true });
LeaderboardMemberSchema.index({ userId: 1 });
