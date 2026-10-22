import { Schema, SchemaTypes } from 'mongoose';

import { RuleJobStatusesList } from '../../util/CustomRules';
import { generateFlake } from '../../util/Snowflake';

import type { IRuleJobZodSchema } from '../zod';

export const RuleJobSchemaName = 'RuleJob';

/** Progress of applying a user's custom rules to their past heartbeats (`custom_rules_progress`). */
export const RuleJobSchema = new Schema<IRuleJobZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		status: { type: SchemaTypes.String, enum: RuleJobStatusesList, required: true },
		progress: { type: SchemaTypes.Number, required: true, default: 0, min: 0, max: 100 },
		changedHeartbeats: { type: SchemaTypes.Number, required: true, default: 0 },
		deletedHeartbeats: { type: SchemaTypes.Number, required: true, default: 0 },
		error: { type: SchemaTypes.String, required: false },
		finishedAt: { type: SchemaTypes.Date, required: false },
	},
	{ timestamps: true, versionKey: false },
);

RuleJobSchema.index({ userId: 1, createdAt: -1 });
