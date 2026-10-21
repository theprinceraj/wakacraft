import { Schema, SchemaTypes } from 'mongoose';

import { createSubSchema } from '../../util/Constants';
import { generateFlake } from '../../util/Snowflake';

import type { IDailySummaryZodSchema } from '../zod';

export const DailySummarySchemaName = 'DailySummary';

const statItemSchema = createSubSchema({
	name: { type: SchemaTypes.String, required: true },
	totalSeconds: { type: SchemaTypes.Number, required: true },
	aiLineChanges: { type: SchemaTypes.Number, required: true, default: 0 },
	humanLineChanges: { type: SchemaTypes.Number, required: true, default: 0 },
});

/**
 * Cached per-day rollup of a user's heartbeats for one (timezone, timeout, writesOnly) combination.
 * Ingesting a heartbeat deletes the rollups of the day it lands in, so a cached day is never stale.
 */
export const DailySummarySchema = new Schema<IDailySummaryZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		/** Local calendar date, YYYY-MM-DD, in `timezone`. */
		date: { type: SchemaTypes.String, required: true },
		timezone: { type: SchemaTypes.String, required: true },
		timeout: { type: SchemaTypes.Number, required: true },
		writesOnly: { type: SchemaTypes.Boolean, required: true },
		totalSeconds: { type: SchemaTypes.Number, required: true },
		aiLineChanges: { type: SchemaTypes.Number, required: true, default: 0 },
		humanLineChanges: { type: SchemaTypes.Number, required: true, default: 0 },
		aiInputTokens: { type: SchemaTypes.Number, required: true, default: 0 },
		aiCachedInputTokens: { type: SchemaTypes.Number, required: true, default: 0 },
		aiOutputTokens: { type: SchemaTypes.Number, required: true, default: 0 },
		aiSessions: { type: SchemaTypes.Number, required: true, default: 0 },
		projects: { type: [statItemSchema], required: true },
		languages: { type: [statItemSchema], required: true },
		editors: { type: [statItemSchema], required: true },
		operatingSystems: { type: [statItemSchema], required: true },
		categories: { type: [statItemSchema], required: true },
		machines: { type: [statItemSchema], required: true },
		dependencies: { type: [statItemSchema], required: true },
	},
	{ timestamps: true, versionKey: false },
);

DailySummarySchema.index({ userId: 1, timezone: 1, timeout: 1, writesOnly: 1, date: 1 }, { unique: true });
DailySummarySchema.index({ userId: 1, date: 1 });
