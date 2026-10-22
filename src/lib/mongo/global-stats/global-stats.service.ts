import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { GlobalStatsSchema, GlobalStatsSchemaName } from '../schemas/global-stats.schema';

import type { IGlobalStatsZodSchema, IGlobalStatsZodSchemaInput } from '../zod';

export class MongoGlobalStatsService extends MongoBaseService<IGlobalStatsZodSchemaInput, IGlobalStatsZodSchema> {
	public readonly model = registerModel<IGlobalStatsZodSchemaInput, IGlobalStatsZodSchema>(
		GlobalStatsSchemaName,
		GlobalStatsSchema,
	);
}

export const mongoGlobalStatsService = new MongoGlobalStatsService();
