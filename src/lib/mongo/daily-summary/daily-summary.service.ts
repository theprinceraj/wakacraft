import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { DailySummarySchema, DailySummarySchemaName } from '../schemas/daily-summary.schema';

import type { IDailySummaryZodSchema, IDailySummaryZodSchemaInput } from '../zod';

export class MongoDailySummaryService extends MongoBaseService<IDailySummaryZodSchemaInput, IDailySummaryZodSchema> {
	public readonly model = registerModel<IDailySummaryZodSchemaInput, IDailySummaryZodSchema>(
		DailySummarySchemaName,
		DailySummarySchema,
	);
}

export const mongoDailySummaryService = new MongoDailySummaryService();
