import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IOrgDashboardZodSchema } from '../zod';

export const OrgDashboardSchemaName = 'OrgDashboard';

/** A view over an org: which members it shows and which of their projects count. Empty lists mean "all". */
export const OrgDashboardSchema = new Schema<IOrgDashboardZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		orgId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true, minLength: 1, maxLength: 80 },
		/** User ids of the org members shown; empty shows every member. */
		memberIds: { type: [SchemaTypes.String], required: true, default: [] },
		/** Project names counted; empty counts all projects. */
		projects: { type: [SchemaTypes.String], required: true, default: [] },
	},
	{ timestamps: true, versionKey: false },
);

OrgDashboardSchema.index({ orgId: 1 });
