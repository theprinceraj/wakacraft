import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IRollupInvalidationZodSchema } from '../zod';

export const RollupInvalidationSchemaName = 'RollupInvalidation';

/**
 * A counter per user and date, bumped whenever new activity could change that date's rollups. A rollup whose
 * computation saw the counter change may have missed that activity, so it is discarded instead of cached (see
 * `loadDayTotals`). Only recent counters matter; Mongo drops them an hour after their last bump.
 */
export const RollupInvalidationSchema = new Schema<IRollupInvalidationZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		/** A calendar date (YYYY-MM-DD) whose rollups, in any timezone, the activity could have changed. */
		date: { type: SchemaTypes.String, required: true },
		generation: { type: SchemaTypes.Number, required: true, default: 0 },
		at: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);

RollupInvalidationSchema.index({ userId: 1, date: 1 }, { unique: true });
RollupInvalidationSchema.index({ at: 1 }, { expireAfterSeconds: 3600 });
