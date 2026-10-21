import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { ApiKeySchema, ApiKeySchemaName } from '../schemas/api-key.schema';

import type { IApiKeyZodSchema, IApiKeyZodSchemaInput } from '../zod';

export class MongoApiKeyService extends MongoBaseService<IApiKeyZodSchemaInput, IApiKeyZodSchema> {
	public readonly model = registerModel<IApiKeyZodSchemaInput, IApiKeyZodSchema>(ApiKeySchemaName, ApiKeySchema);
}

export const mongoApiKeyService = new MongoApiKeyService();
