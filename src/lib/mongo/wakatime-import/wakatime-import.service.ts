import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { WakatimeImportSchema, WakatimeImportSchemaName } from '../schemas/wakatime-import.schema';

import type { IWakatimeImportZodSchema, IWakatimeImportZodSchemaInput } from '../zod';

export class MongoWakatimeImportService extends MongoBaseService<
	IWakatimeImportZodSchemaInput,
	IWakatimeImportZodSchema
> {
	public readonly model = registerModel<IWakatimeImportZodSchemaInput, IWakatimeImportZodSchema>(
		WakatimeImportSchemaName,
		WakatimeImportSchema,
	);

	/**
	 * Takes the job's lease if it is running, free (never leased or lapsed) and not waiting out a rate limit. Returns
	 * the job with its encrypted API key, or null when someone else holds it or there is nothing to do.
	 */
	public async acquireLease(id: string, leaseMs: number): Promise<IWakatimeImportZodSchema | null> {
		const now = new Date();
		// `+apiKey` adds the select:false key to the full document.
		return (await this.updateOne(
			{
				id,
				status: 'running',
				$and: [
					{ $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lt: now } }] },
					{ $or: [{ retryAt: { $exists: false } }, { retryAt: { $lt: now } }] },
				],
			},
			{ $set: { leaseUntil: new Date(now.getTime() + leaseMs) }, $unset: { retryAt: 1 } },
			{},
			'+apiKey',
		)) as IWakatimeImportZodSchema | null;
	}
}

export const mongoWakatimeImportService = new MongoWakatimeImportService();
