import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { GoalSchema, GoalSchemaName } from '../schemas/goal.schema';

import type { IGoalZodSchema, IGoalZodSchemaInput } from '../zod';

export class MongoGoalService extends MongoBaseService<IGoalZodSchemaInput, IGoalZodSchema> {
	public readonly model = registerModel<IGoalZodSchemaInput, IGoalZodSchema>(GoalSchemaName, GoalSchema);
}

export const mongoGoalService = new MongoGoalService();
