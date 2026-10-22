import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { DataDumpSchema, DataDumpSchemaName } from '../schemas/data-dump.schema';

import type { IDataDumpZodSchema, IDataDumpZodSchemaInput } from '../zod';

export class MongoDataDumpService extends MongoBaseService<IDataDumpZodSchemaInput, IDataDumpZodSchema> {
	public readonly model = registerModel<IDataDumpZodSchemaInput, IDataDumpZodSchema>(
		DataDumpSchemaName,
		DataDumpSchema,
	);
}

export const mongoDataDumpService = new MongoDataDumpService();
