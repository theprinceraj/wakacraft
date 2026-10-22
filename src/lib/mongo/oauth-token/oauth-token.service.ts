import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { OAuthTokenSchema, OAuthTokenSchemaName } from '../schemas/oauth-token.schema';

import type { IOAuthTokenZodSchema, IOAuthTokenZodSchemaInput } from '../zod';

export class MongoOAuthTokenService extends MongoBaseService<IOAuthTokenZodSchemaInput, IOAuthTokenZodSchema> {
	public readonly model = registerModel<IOAuthTokenZodSchemaInput, IOAuthTokenZodSchema>(
		OAuthTokenSchemaName,
		OAuthTokenSchema,
	);
}

export const mongoOAuthTokenService = new MongoOAuthTokenService();
