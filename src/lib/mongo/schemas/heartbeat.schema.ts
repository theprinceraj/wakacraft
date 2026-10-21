import { Schema, SchemaTypes } from 'mongoose';

import { CategoriesList, Categories, HeartbeatTypesList } from '../../util/Heartbeats';
import { generateFlake } from '../../util/Snowflake';

import type { IHeartbeatZodSchema } from '../zod';

export const HeartbeatSchemaName = 'Heartbeat';

/**
 * One editor activity ping, as sent by wakatime-cli. Field names are camelCase here and mapped to the
 * WakaTime snake_case wire format in the heartbeat request/response DTOs.
 */
export const HeartbeatSchema = new Schema<IHeartbeatZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		entity: { type: SchemaTypes.String, required: true },
		type: { type: SchemaTypes.String, enum: HeartbeatTypesList, required: true },
		category: { type: SchemaTypes.String, enum: CategoriesList, required: true, default: Categories.Coding },
		/** UNIX epoch seconds with fractional part, exactly as the client sent it. */
		time: { type: SchemaTypes.Number, required: true },
		project: { type: SchemaTypes.String, required: false },
		projectRootCount: { type: SchemaTypes.Number, required: false },
		branch: { type: SchemaTypes.String, required: false },
		language: { type: SchemaTypes.String, required: false },
		dependencies: { type: [SchemaTypes.String], required: false, default: undefined },
		lines: { type: SchemaTypes.Number, required: false },
		lineno: { type: SchemaTypes.Number, required: false },
		cursorpos: { type: SchemaTypes.Number, required: false },
		isWrite: { type: SchemaTypes.Boolean, required: true, default: false },
		aiLineChanges: { type: SchemaTypes.Number, required: false },
		humanLineChanges: { type: SchemaTypes.Number, required: false },
		aiSession: { type: SchemaTypes.String, required: false },
		aiInputTokens: { type: SchemaTypes.Number, required: false },
		aiCachedInputTokens: { type: SchemaTypes.Number, required: false },
		aiOutputTokens: { type: SchemaTypes.Number, required: false },
		aiPromptLength: { type: SchemaTypes.Number, required: false },
		aiSubscriptionPlan: { type: SchemaTypes.String, required: false },
		/** Denormalized from the user agent / headers so aggregation never needs a join. */
		userAgentId: { type: SchemaTypes.String, required: false },
		editor: { type: SchemaTypes.String, required: false },
		operatingSystem: { type: SchemaTypes.String, required: false },
		machine: { type: SchemaTypes.String, required: false },
		/** Hash of the identifying fields; offline-queue resends of the same heartbeat collide on it. */
		dedupHash: { type: SchemaTypes.String, required: true, select: false },
	},
	{ timestamps: true, versionKey: false },
);

HeartbeatSchema.index({ userId: 1, time: 1 });
HeartbeatSchema.index({ userId: 1, dedupHash: 1 }, { unique: true });
HeartbeatSchema.index({ userId: 1, project: 1, time: 1 });
