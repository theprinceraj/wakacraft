import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { OAuthAppSchema, OAuthAppSchemaName } from '../schemas/oauth-app.schema';

import type { IOAuthAppZodSchema, IOAuthAppZodSchemaInput } from '../zod';

export class MongoOAuthAppService extends MongoBaseService<IOAuthAppZodSchemaInput, IOAuthAppZodSchema> {
	public readonly model = registerModel<IOAuthAppZodSchemaInput, IOAuthAppZodSchema>(
		OAuthAppSchemaName,
		OAuthAppSchema,
	);

	/** The app with its select:false secret hash, for authenticating the client. */
	public async findByClientIdWithSecret(clientId: string): Promise<IOAuthAppZodSchema | null> {
		return (await this.findOne({ clientId }, '+clientSecretHash')) as IOAuthAppZodSchema | null;
	}
}

export const mongoOAuthAppService = new MongoOAuthAppService();
