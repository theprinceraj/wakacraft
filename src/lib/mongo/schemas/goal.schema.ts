import { Schema, SchemaTypes } from 'mongoose';

import { GoalDeltasList, Weekdays } from '../../util/Goals';
import { generateFlake } from '../../util/Snowflake';

import type { IGoalZodSchema } from '../zod';

export const GoalSchemaName = 'Goal';

/**
 * A coding-time target per day or week. Filters narrow which activity counts (empty = all); `isInverse` flips the
 * goal into a ceiling ("code at most N hours").
 */
export const GoalSchema = new Schema<IGoalZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		/** Custom title; when absent the title is generated from the goal's settings. */
		title: { type: SchemaTypes.String, required: false, maxLength: 120 },
		delta: { type: SchemaTypes.String, enum: GoalDeltasList, required: true },
		seconds: { type: SchemaTypes.Number, required: true, min: 60, max: 7 * 86_400 },
		isInverse: { type: SchemaTypes.Boolean, required: true, default: false },
		projects: { type: [SchemaTypes.String], required: true, default: [] },
		languages: { type: [SchemaTypes.String], required: true, default: [] },
		editors: { type: [SchemaTypes.String], required: true, default: [] },
		categories: { type: [SchemaTypes.String], required: true, default: [] },
		/** Days that never count for or against a daily goal. */
		ignoreDays: { type: [SchemaTypes.String], enum: Weekdays, required: true, default: [] },
		/** Days with no activity at all are skipped instead of failed (holidays). */
		ignoreZeroDays: { type: SchemaTypes.Boolean, required: true, default: false },
		isEnabled: { type: SchemaTypes.Boolean, required: true, default: true },
		snoozeUntil: { type: SchemaTypes.Date, required: false },
	},
	{ timestamps: true, versionKey: false },
);

GoalSchema.index({ userId: 1, createdAt: -1 });
