import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { RuleJobSchema, RuleJobSchemaName } from '../schemas/rule-job.schema';

import type { IRuleJobZodSchema, IRuleJobZodSchemaInput } from '../zod';

export class MongoRuleJobService extends MongoBaseService<IRuleJobZodSchemaInput, IRuleJobZodSchema> {
	public readonly model = registerModel<IRuleJobZodSchemaInput, IRuleJobZodSchema>(RuleJobSchemaName, RuleJobSchema);
}

export const mongoRuleJobService = new MongoRuleJobService();
