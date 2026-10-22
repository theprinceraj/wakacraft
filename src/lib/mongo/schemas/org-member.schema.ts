import { Schema, SchemaTypes } from 'mongoose';

import { OrgRolesList } from '../../util/Orgs';
import { generateFlake } from '../../util/Snowflake';

import type { IOrgMemberZodSchema } from '../zod';

export const OrgMemberSchemaName = 'OrgMember';

export const OrgMemberSchema = new Schema<IOrgMemberZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		orgId: { type: SchemaTypes.String, required: true },
		userId: { type: SchemaTypes.String, required: true },
		role: { type: SchemaTypes.String, enum: OrgRolesList, required: true, default: 'member' },
	},
	{ timestamps: true, versionKey: false },
);

OrgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });
OrgMemberSchema.index({ userId: 1 });
