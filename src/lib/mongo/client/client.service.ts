import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { ClientSchema, ClientSchemaName } from '../schemas/client.schema';

import type { IClientZodSchema, IClientZodSchemaInput } from '../zod';

export class MongoClientService extends MongoBaseService<IClientZodSchemaInput, IClientZodSchema> {
	public readonly model = registerModel<IClientZodSchemaInput, IClientZodSchema>(ClientSchemaName, ClientSchema);
}

export const mongoClientService = new MongoClientService();
