import { Schema, SchemaTypes } from 'mongoose';

import { createSubSchema } from '../../util/Constants';
import { RuleActionsList, RuleFieldsList, RuleOperationsList } from '../../util/CustomRules';
import { generateFlake } from '../../util/Snowflake';

import type { ICustomRuleZodSchema } from '../zod';

export const CustomRuleSchemaName = 'CustomRule';

const destinationSchema = createSubSchema({
	id: { type: SchemaTypes.String, default: generateFlake, required: true },
	destination: { type: SchemaTypes.String, enum: RuleFieldsList, required: true },
	destinationValue: { type: SchemaTypes.String, required: true, maxLength: 512 },
});

/**
 * "If <source> <operation> <sourceValue>, then change <destinations> (or delete the heartbeat)" — WakaTime's custom
 * rule. Rules run in ascending `priority`, each seeing the previous rules' changes.
 */
export const CustomRuleSchema = new Schema<ICustomRuleZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		action: { type: SchemaTypes.String, enum: RuleActionsList, required: true },
		source: { type: SchemaTypes.String, enum: RuleFieldsList, required: true },
		operation: { type: SchemaTypes.String, enum: RuleOperationsList, required: true },
		sourceValue: { type: SchemaTypes.String, required: true, minLength: 1, maxLength: 512 },
		destinations: { type: [destinationSchema], required: true, default: [] },
		priority: { type: SchemaTypes.Number, required: true, min: 1 },
	},
	{ timestamps: true, versionKey: false },
);

CustomRuleSchema.index({ userId: 1, priority: 1 });
