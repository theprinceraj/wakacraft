import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { CustomRuleSchema, CustomRuleSchemaName } from '../schemas/custom-rule.schema';

import type { ICustomRuleZodSchema, ICustomRuleZodSchemaInput } from '../zod';

export class MongoCustomRuleService extends MongoBaseService<ICustomRuleZodSchemaInput, ICustomRuleZodSchema> {
	public readonly model = registerModel<ICustomRuleZodSchemaInput, ICustomRuleZodSchema>(
		CustomRuleSchemaName,
		CustomRuleSchema,
	);
}

export const mongoCustomRuleService = new MongoCustomRuleService();
