import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { UserAgentSchema, UserAgentSchemaName } from '../schemas/user-agent.schema';

import type { IUserAgentZodSchema, IUserAgentZodSchemaInput } from '../zod';

export class MongoUserAgentService extends MongoBaseService<IUserAgentZodSchemaInput, IUserAgentZodSchema> {
	public readonly model = registerModel<IUserAgentZodSchemaInput, IUserAgentZodSchema>(
		UserAgentSchemaName,
		UserAgentSchema,
	);
}

export const mongoUserAgentService = new MongoUserAgentService();
