import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { OAuthCodeSchema, OAuthCodeSchemaName } from '../schemas/oauth-code.schema';

import type { IOAuthCodeZodSchema, IOAuthCodeZodSchemaInput } from '../zod';

export class MongoOAuthCodeService extends MongoBaseService<IOAuthCodeZodSchemaInput, IOAuthCodeZodSchema> {
	public readonly model = registerModel<IOAuthCodeZodSchemaInput, IOAuthCodeZodSchema>(
		OAuthCodeSchemaName,
		OAuthCodeSchema,
	);

	/** Deletes and returns the code in one step, so it can only ever be exchanged once. */
	public async consume(codeHash: string, appId: string): Promise<IOAuthCodeZodSchema | null> {
		return (await this.model.findOneAndDelete({ codeHash, appId }).lean().exec()) as IOAuthCodeZodSchema | null;
	}
}

export const mongoOAuthCodeService = new MongoOAuthCodeService();
