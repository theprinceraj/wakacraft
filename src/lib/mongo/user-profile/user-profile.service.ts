import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { UserProfileSchema, UserProfileSchemaName } from '../schemas/user-profile.schema';

import type { IUserProfileZodSchema, IUserProfileZodSchemaInput } from '../zod';

export class MongoUserProfileService extends MongoBaseService<IUserProfileZodSchemaInput, IUserProfileZodSchema> {
	public readonly model = registerModel<IUserProfileZodSchemaInput, IUserProfileZodSchema>(
		UserProfileSchemaName,
		UserProfileSchema,
	);
}

export const mongoUserProfileService = new MongoUserProfileService();
