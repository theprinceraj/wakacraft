import { Schema, SchemaTypes } from 'mongoose';

import { createSubSchema } from '../../util/Constants';
import { generateFlake } from '../../util/Snowflake';

import type { ILeaderboardCacheZodSchema } from '../zod';

export const LeaderboardCacheSchemaName = 'LeaderboardCache';

const languageSchema = createSubSchema({
	name: { type: SchemaTypes.String, required: true },
	totalSeconds: { type: SchemaTypes.Number, required: true },
});

const entrySchema = createSubSchema({
	userId: { type: SchemaTypes.String, required: true },
	totalSeconds: { type: SchemaTypes.Number, required: true },
	languages: { type: [languageSchema], required: true },
});

/**
 * Ranked totals for one board (`public` or a leaderboard id), recomputed when older than the cache window.
 * Ranking reads every member's last week, so this keeps leaderboard views cheap.
 */
export const LeaderboardCacheSchema = new Schema<ILeaderboardCacheZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		board: { type: SchemaTypes.String, required: true, unique: true },
		start: { type: SchemaTypes.String, required: true },
		end: { type: SchemaTypes.String, required: true },
		entries: { type: [entrySchema], required: true },
		computedAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);
