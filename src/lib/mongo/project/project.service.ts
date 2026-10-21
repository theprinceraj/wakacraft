import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { ProjectSchema, ProjectSchemaName } from '../schemas/project.schema';

import type { IProjectZodSchema, IProjectZodSchemaInput } from '../zod';

export class MongoProjectService extends MongoBaseService<IProjectZodSchemaInput, IProjectZodSchema> {
	public readonly model = registerModel<IProjectZodSchemaInput, IProjectZodSchema>(ProjectSchemaName, ProjectSchema);
}

export const mongoProjectService = new MongoProjectService();
