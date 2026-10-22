import { Schema, SchemaTypes } from 'mongoose';

import { CategoriesList, Categories, HeartbeatTypesList } from '../../util/Heartbeats';
import { generateFlake } from '../../util/Snowflake';

import type { IExternalDurationZodSchema } from '../zod';

export const ExternalDurationSchemaName = 'ExternalDuration';

/**
 * Time spent outside the editor (meetings, calendar events, design tools), sent through WakaTime's
 * `external_durations` API. `externalId` is the client's own id, so re-sending an event updates it instead of
 * duplicating it.
 */
export const ExternalDurationSchema = new Schema<IExternalDurationZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		externalId: { type: SchemaTypes.String, required: true, maxLength: 256 },
		provider: { type: SchemaTypes.String, required: false, maxLength: 128 },
		entity: { type: SchemaTypes.String, required: true, maxLength: 2048 },
		type: { type: SchemaTypes.String, enum: HeartbeatTypesList, required: true },
		category: { type: SchemaTypes.String, enum: CategoriesList, required: true, default: Categories.Meeting },
		/** Epoch seconds. */
		startTime: { type: SchemaTypes.Number, required: true },
		endTime: { type: SchemaTypes.Number, required: true },
		project: { type: SchemaTypes.String, required: false },
		branch: { type: SchemaTypes.String, required: false },
		language: { type: SchemaTypes.String, required: false },
		meta: { type: SchemaTypes.String, required: false, maxLength: 2048 },
	},
	{ timestamps: true, versionKey: false },
);

ExternalDurationSchema.index({ userId: 1, externalId: 1 }, { unique: true });
ExternalDurationSchema.index({ userId: 1, startTime: 1, endTime: 1 });
