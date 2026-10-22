import { Schema, SchemaTypes } from 'mongoose';

import { DataDumpTypesList } from '../../util/DataDumps';
import { generateFlake } from '../../util/Snowflake';

import type { IDataDumpZodSchema } from '../zod';

export const DataDumpSchemaName = 'DataDump';

/**
 * A requested export (`data_dumps`). The file itself is not stored: the download streams it from the database on
 * demand, so the record only tracks what was requested and until when the link works.
 */
export const DataDumpSchema = new Schema<IDataDumpZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		type: { type: SchemaTypes.String, enum: DataDumpTypesList, required: true },
		expiresAt: { type: SchemaTypes.Date, required: true },
	},
	{ timestamps: true, versionKey: false },
);

DataDumpSchema.index({ userId: 1, createdAt: -1 });
