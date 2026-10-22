import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { ExternalDurationSchema, ExternalDurationSchemaName } from '../schemas/external-duration.schema';

import type { IExternalDurationZodSchema, IExternalDurationZodSchemaInput } from '../zod';

export class MongoExternalDurationService extends MongoBaseService<
	IExternalDurationZodSchemaInput,
	IExternalDurationZodSchema
> {
	public readonly model = registerModel<IExternalDurationZodSchemaInput, IExternalDurationZodSchema>(
		ExternalDurationSchemaName,
		ExternalDurationSchema,
	);

	/** External durations overlapping `[start, end)`. */
	public async findOverlapping(userId: string, start: number, end: number, extraFilter: Record<string, unknown> = {}) {
		return this.find({ userId, startTime: { $lt: end }, endTime: { $gt: start }, ...extraFilter }, '', {
			sort: { startTime: 1 },
		});
	}
}

export const mongoExternalDurationService = new MongoExternalDurationService();
