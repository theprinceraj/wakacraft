import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { HeartbeatSchema, HeartbeatSchemaName } from '../schemas/heartbeat.schema';

import type { IHeartbeatZodSchema, IHeartbeatZodSchemaInput } from '../zod';

type HeartbeatInsert = Omit<IHeartbeatZodSchemaInput, 'id' | 'createdAt' | 'updatedAt'>;

export interface InsertManyResult {
	/** Per input index: the stored heartbeat, or `null` when it was a duplicate of one already stored. */
	inserted: (IHeartbeatZodSchema | null)[];
}

export class MongoHeartbeatService extends MongoBaseService<IHeartbeatZodSchemaInput, IHeartbeatZodSchema> {
	public readonly model = registerModel<IHeartbeatZodSchemaInput, IHeartbeatZodSchema>(
		HeartbeatSchemaName,
		HeartbeatSchema,
	);

	/**
	 * Unordered insert that treats duplicate-key collisions on `dedupHash` as "already stored" instead of
	 * failing the batch. wakatime-cli resends its offline queue, so duplicates are expected traffic.
	 */
	public async insertManyIgnoringDuplicates(docs: HeartbeatInsert[]): Promise<InsertManyResult> {
		const prepared = docs.map((doc) => new this.model(doc));
		const duplicateIndexes = new Set<number>();

		try {
			await this.model.insertMany(prepared, { ordered: false });
		} catch (error: any) {
			// Driver write errors carry `index` at the top level and the server's `code` under `err`.
			const writeErrors: { index: number; code?: number; err?: { code?: number } }[] = error?.writeErrors ?? [];
			if (!writeErrors.length) throw error;

			for (const writeError of writeErrors) {
				if ((writeError.code ?? writeError.err?.code) !== 11_000) throw error;
				duplicateIndexes.add(writeError.index);
			}
		}

		return {
			inserted: prepared.map((doc, index) =>
				duplicateIndexes.has(index) ? null : (doc.toJSON() as unknown as IHeartbeatZodSchema),
			),
		};
	}

	/** Heartbeats in `[start, end)` (epoch seconds), oldest first — the input order every duration algorithm needs. */
	public async findInRange(
		userId: string,
		start: number,
		end: number,
		extraFilter: Record<string, unknown> = {},
		select = '-dedupHash',
	): Promise<IHeartbeatZodSchema[]> {
		return this.find({ userId, time: { $gte: start, $lt: end }, ...extraFilter }, select, {
			sort: { time: 1 },
		}) as Promise<IHeartbeatZodSchema[]>;
	}

	/** The earliest heartbeat at or after `time`, used to measure the gap that crosses a range's end. */
	public async findFirstAtOrAfter(
		userId: string,
		time: number,
		extraFilter: Record<string, unknown> = {},
	): Promise<Pick<IHeartbeatZodSchema, 'time'> | null> {
		const [first] = await this.find({ userId, time: { $gte: time }, ...extraFilter }, ['time'], {
			sort: { time: 1 },
			limit: 1,
		});
		return first ?? null;
	}

	/** Every heartbeat of a user, oldest first, without loading them all into memory (exports). */
	public streamForUser(userId: string): AsyncIterable<IHeartbeatZodSchema> {
		return this.model
			.find({ userId })
			.sort({ time: 1 })
			.select('-dedupHash')
			.lean()
			.cursor({ batchSize: 1000 }) as unknown as AsyncIterable<IHeartbeatZodSchema>;
	}

	public async findLast(userId: string): Promise<Pick<IHeartbeatZodSchema, 'time'> | null> {
		const [last] = await this.find({ userId }, ['time'], { sort: { time: -1 }, limit: 1 });
		return last ?? null;
	}

	public async findFirst(userId: string): Promise<Pick<IHeartbeatZodSchema, 'time'> | null> {
		const [first] = await this.find({ userId }, ['time'], { sort: { time: 1 }, limit: 1 });
		return first ?? null;
	}
}

export const mongoHeartbeatService = new MongoHeartbeatService();
