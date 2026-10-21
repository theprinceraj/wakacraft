import { Schema, SchemaTypes } from 'mongoose';

import { generateFlake } from '../../util/Snowflake';

import type { IProjectZodSchema } from '../zod';

export const ProjectSchemaName = 'Project';

/** Created on the first heartbeat that names a project; tracks first/last activity for the projects list. */
export const ProjectSchema = new Schema<IProjectZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		name: { type: SchemaTypes.String, required: true },
		color: { type: SchemaTypes.String, required: false },
		repository: { type: SchemaTypes.String, required: false },
		hasPublicUrl: { type: SchemaTypes.Boolean, required: true, default: false },
		firstHeartbeatAt: { type: SchemaTypes.Date, required: true },
		lastHeartbeatAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);

ProjectSchema.index({ userId: 1, name: 1 }, { unique: true });
ProjectSchema.index({ userId: 1, lastHeartbeatAt: -1 });
