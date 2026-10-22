import { Schema, SchemaTypes } from 'mongoose';

import { createSubSchema } from '../../util/Constants';
import { generateFlake } from '../../util/Snowflake';

import type { IGlobalStatsZodSchema } from '../zod';

export const GlobalStatsSchemaName = 'GlobalStats';

const itemSchema = createSubSchema({
	name: { type: SchemaTypes.String, required: true },
	totalSeconds: { type: SchemaTypes.Number, required: true },
	/** Public users who spent any time on it. */
	users: { type: SchemaTypes.Number, required: true },
});

/** Site-wide totals across public users for one range (`stats/:range`), recomputed when older than an hour. */
export const GlobalStatsSchema = new Schema<IGlobalStatsZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		range: { type: SchemaTypes.String, required: true, unique: true },
		start: { type: SchemaTypes.String, required: true },
		end: { type: SchemaTypes.String, required: true },
		users: { type: SchemaTypes.Number, required: true },
		totalSeconds: { type: SchemaTypes.Number, required: true },
		languages: { type: [itemSchema], required: true },
		editors: { type: [itemSchema], required: true },
		categories: { type: [itemSchema], required: true },
		operatingSystems: { type: [itemSchema], required: true },
		computedAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);
