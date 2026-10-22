import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { RollupInvalidationSchema, RollupInvalidationSchemaName } from '../schemas/rollup-invalidation.schema';

import type { IRollupInvalidationZodSchema, IRollupInvalidationZodSchemaInput } from '../zod';

export class MongoRollupInvalidationService extends MongoBaseService<
	IRollupInvalidationZodSchemaInput,
	IRollupInvalidationZodSchema
> {
	public readonly model = registerModel<IRollupInvalidationZodSchemaInput, IRollupInvalidationZodSchema>(
		RollupInvalidationSchemaName,
		RollupInvalidationSchema,
	);

	/** Records that these dates changed. */
	public async bump(userId: string, dates: string[]): Promise<void> {
		if (!dates.length) return;
		await Promise.all(
			dates.map((date) =>
				this.updateOne(
					{ userId, date },
					{ $inc: { generation: 1 }, $set: { at: new Date() }, $setOnInsert: { userId, date } },
					{ upsert: true, setDefaultsOnInsert: true },
					['generation'],
				).catch(() =>
					// Two first bumps for a date can race on the unique key; the retry finds the document.
					this.updateOne({ userId, date }, { $inc: { generation: 1 }, $set: { at: new Date() } }, {}, ['generation']),
				),
			),
		);
	}

	/** Each date's current generation; dates never bumped (or long since) are absent. */
	public async generations(userId: string, dates: string[]): Promise<Map<string, number>> {
		if (!dates.length) return new Map();
		const rows = await this.find({ userId, date: { $in: dates } }, ['date', 'generation']);
		return new Map(rows.map((row) => [row.date, row.generation]));
	}
}

export const mongoRollupInvalidationService = new MongoRollupInvalidationService();
