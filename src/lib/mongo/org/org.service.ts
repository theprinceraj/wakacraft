import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { OrgSchema, OrgSchemaName } from '../schemas/org.schema';

import type { IOrgZodSchema, IOrgZodSchemaInput } from '../zod';

export class MongoOrgService extends MongoBaseService<IOrgZodSchemaInput, IOrgZodSchema> {
	public readonly model = registerModel<IOrgZodSchemaInput, IOrgZodSchema>(OrgSchemaName, OrgSchema);
}

export const mongoOrgService = new MongoOrgService();
