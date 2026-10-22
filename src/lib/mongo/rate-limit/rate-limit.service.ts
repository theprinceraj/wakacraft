import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { RateLimitSchema, RateLimitSchemaName } from '../schemas/rate-limit.schema';

import type { IRateLimitZodSchema, IRateLimitZodSchemaInput } from '../zod';

export class MongoRateLimitService extends MongoBaseService<IRateLimitZodSchemaInput, IRateLimitZodSchema> {
	public readonly model = registerModel<IRateLimitZodSchemaInput, IRateLimitZodSchema>(
		RateLimitSchemaName,
		RateLimitSchema,
	);

	/** Adds `amount` to the window's counter, creating it on first use, and returns the new count. */
	public async increment(key: string, amount: number, expiresAt: Date): Promise<number> {
		const update = { $inc: { count: amount }, $setOnInsert: { key, expiresAt } };
		const options = { upsert: true, setDefaultsOnInsert: true };
		try {
			return (await this.updateOne({ key }, update, options, ['count']))!.count;
		} catch {
			// Two first requests in a window can race on the unique key; the loser's retry finds the document.
			return (await this.updateOne({ key }, update, options, ['count']))!.count;
		}
	}
}

export const mongoRateLimitService = new MongoRateLimitService();
