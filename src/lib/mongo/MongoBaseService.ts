import { BadRequestException } from '@/lib/http/errors';
import {
	Model,
	type QueryFilter,
	type UpdateQuery,
	type QueryOptions,
	type MongooseUpdateQueryOptions,
	type SaveOptions,
	type SortOrder,
} from 'mongoose';

import type { UpdateOptions } from 'mongodb';

class MongoError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MongoError';
	}
}

/**
 * A duplicate-key error names the offending field(s) in `keyValue` (e.g. `{ productCode: 'ABC' }`) —
 * surfaced here so "Document already exists" points at what actually collided instead of leaving
 * the caller to guess which unique index fired.
 */
function duplicateKeyMessage(error: { keyValue?: Record<string, unknown> }): string {
	const fields = Object.entries(error.keyValue ?? {});
	if (fields.length === 0) return 'Document already exists';

	return `Document already exists with ${fields.map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join(', ')}`;
}

type SplitString<S extends string> = S extends ''
	? []
	: S extends `${infer Head} ${infer Tail}`
		? [Head, ...SplitString<Tail>]
		: [S];

type ArrayToUnion<T extends any[]> = T[number];

type Split<S extends string> = ArrayToUnion<SplitString<S>>;

type SelectedFields<T, S extends string> = {
	[K in Split<S> & keyof T]: T[K];
};

type SelectType<T> = keyof T extends string ? string : never;

type SelectReturn<T, S extends SelectType<T>> = string extends S ? T : S extends '' ? T : SelectedFields<T, S>;

type RequiredProps<T> = {
	[K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];
type RequiredFields<T> = Pick<T, RequiredProps<T>>;

// TODO: include/exclude isn't handled in return types yet
type SelectWithExcludeAndInclude<K> = K extends string ? K | `-${K}` | `+${K}` : K;

export interface FindOptions {
	skip?: number;
	limit?: number;
	sort?: Record<string, SortOrder>;
}

export interface IModelOperations<TInput, TOutput> {
	aggregate: <R = any>(pipeline: object[]) => Promise<R[]>;
	count: (query: QueryFilter<TOutput>) => Promise<number>;
	create: (
		data: RequiredFields<Omit<TInput, 'id' | 'createdAt' | 'updatedAt'>> & Partial<TInput>,
		options?: SaveOptions,
	) => Promise<TOutput>;
	deleteMany: (query: QueryFilter<TOutput>) => Promise<{
		acknowledged: boolean;
		deletedCount: number;
	}>;
	deleteOne: {
		<K extends keyof TOutput>(
			query: QueryFilter<TOutput>,
			select: SelectWithExcludeAndInclude<K>[],
		): Promise<Pick<TOutput, K> | null>;
		<S extends SelectType<TOutput>>(query: QueryFilter<TOutput>, select?: S): Promise<SelectReturn<TOutput, S> | null>;
	};
	exists: (query: QueryFilter<TOutput>) => Promise<boolean>;
	find: {
		<K extends keyof TOutput>(
			query: QueryFilter<TOutput>,
			select: SelectWithExcludeAndInclude<K>[],
			options?: FindOptions,
		): Promise<Pick<TOutput, K>[]>;
		<S extends SelectType<TOutput>>(
			query: QueryFilter<TOutput>,
			select?: S,
			options?: FindOptions,
		): Promise<SelectReturn<TOutput, S>[]>;
	};
	findAll: {
		<K extends keyof TOutput>(
			select: SelectWithExcludeAndInclude<K>[],
			options?: FindOptions,
		): Promise<Pick<TOutput, K>[]>;
		<S extends SelectType<TOutput>>(select?: S, options?: FindOptions): Promise<SelectReturn<TOutput, S>[]>;
	};
	findOne: {
		<K extends keyof TOutput>(
			query: QueryFilter<TOutput>,
			select: SelectWithExcludeAndInclude<K>[],
		): Promise<Pick<TOutput, K> | null>;
		<S extends SelectType<TOutput>>(query: QueryFilter<TOutput>, select?: S): Promise<SelectReturn<TOutput, S> | null>;
	};
	updateMany: (
		query: QueryFilter<TOutput>,
		data: UpdateQuery<TInput>,
		options: UpdateOptions & MongooseUpdateQueryOptions<TInput>,
	) => Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number }>;
	updateOne: {
		<K extends keyof TOutput>(
			query: QueryFilter<TOutput>,
			data: UpdateQuery<TInput>,
			options: QueryOptions<TInput>,
			select: SelectWithExcludeAndInclude<K>[],
		): Promise<Pick<TOutput, K> | null>;
		<S extends SelectType<TOutput>>(
			query: QueryFilter<TOutput>,
			data: UpdateQuery<TInput>,
			options?: QueryOptions<TInput>,
			select?: S,
		): Promise<SelectReturn<TOutput, S> | null>;
	};
}

export abstract class MongoBaseService<TInput, TOutput = TInput> implements IModelOperations<TInput, TOutput> {
	public abstract readonly model: Model<TInput, TOutput>;

	public async create(
		data: RequiredFields<Omit<TInput, 'id' | 'createdAt' | 'updatedAt'>> & Partial<TInput>,
		options?: SaveOptions,
	): Promise<TOutput> {
		try {
			const createdDocument = new this.model(data);
			return (await createdDocument.save(options)).toJSON() as TOutput;
		} catch (error: any) {
			if (error.code === 11_000) throw new BadRequestException(duplicateKeyMessage(error));
			if (error.name === 'ValidationError') {
				throw new BadRequestException(`Invalid document — check these fields: ${Object.keys(error.errors).join(', ')}`);
			}
			console.error(`Error creating document: ${error.message}`);
			throw new MongoError(`Error creating document: ${error.message}`);
		}
	}

	/** Runs the schema's own validators without saving; returns the paths that would fail. */
	public invalidPaths(data: Partial<TInput>): string[] {
		return Object.keys(new this.model(data).validateSync()?.errors ?? {});
	}

	public async findAll<K extends keyof TOutput>(
		select: SelectWithExcludeAndInclude<K>[],
		options?: FindOptions,
	): Promise<Pick<TOutput, K>[]>;
	public async findAll<S extends SelectType<TOutput>>(
		select?: S,
		options?: FindOptions,
	): Promise<SelectReturn<TOutput, S>[]>;

	public async findAll<K extends keyof TOutput | SelectType<TOutput>>(
		select: SelectWithExcludeAndInclude<K>[] | K = '' as K,
		options?: FindOptions,
	): Promise<TOutput[]> {
		try {
			let baseQuery = this.model.find();

			if (options?.sort) baseQuery = baseQuery.sort(options.sort);
			else baseQuery = baseQuery.sort({ id: -1 });

			if (options?.skip !== undefined) baseQuery = baseQuery.skip(options.skip);
			if (options?.limit !== undefined) baseQuery = baseQuery.limit(options.limit);

			if (Array.isArray(select)) {
				const projection = Object.fromEntries(select.map((field) => [field, 1]));
				return (await baseQuery.select(projection).lean().exec()) as TOutput[];
			}

			return (await baseQuery
				.select(select as string)
				.lean()
				.exec()) as TOutput[];
		} catch (error: any) {
			console.error(`Error finding documents: ${error.message}`);
			throw new MongoError(`Error finding documents: ${error.message}`);
		}
	}

	public async find<K extends keyof TOutput>(
		query: QueryFilter<TOutput>,
		select: SelectWithExcludeAndInclude<K>[],
		options?: FindOptions,
	): Promise<Pick<TOutput, K>[]>;
	public async find<S extends SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		select?: S,
		options?: FindOptions,
	): Promise<SelectReturn<TOutput, S>[]>;

	public async find<K extends keyof TOutput | SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		select: SelectWithExcludeAndInclude<K>[] | K = '' as K,
		options?: FindOptions,
	): Promise<TOutput[]> {
		try {
			let baseQuery = this.model.find(query);

			if (options?.sort) baseQuery = baseQuery.sort(options.sort);
			else baseQuery = baseQuery.sort({ id: -1 });

			if (options?.skip !== undefined) baseQuery = baseQuery.skip(options.skip);
			if (options?.limit !== undefined) baseQuery = baseQuery.limit(options.limit);

			if (Array.isArray(select)) {
				const projection = Object.fromEntries(select.map((field) => [field, 1]));
				return (await baseQuery.select(projection).lean().exec()) as TOutput[];
			}

			return (await baseQuery
				.select(select as string)
				.lean()
				.exec()) as TOutput[];
		} catch (error: any) {
			console.error(`Error finding documents: ${error.message}`);
			throw new MongoError(`Error finding documents: ${error.message}`);
		}
	}

	public async findOne<K extends keyof TOutput>(
		query: QueryFilter<TOutput>,
		select: SelectWithExcludeAndInclude<K>[],
	): Promise<Pick<TOutput, K> | null>;
	public async findOne<S extends SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		select?: S,
	): Promise<SelectReturn<TOutput, S> | null>;

	public async findOne<K extends keyof TOutput | SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		select: SelectWithExcludeAndInclude<K>[] | K = '' as K,
	): Promise<TOutput | null> {
		try {
			const baseQuery = this.model.findOne(query);

			if (Array.isArray(select)) {
				const projection = Object.fromEntries(select.map((field) => [field, 1]));
				return (await baseQuery.select(projection).lean().exec()) as TOutput | null;
			}

			return (await baseQuery
				.select(select as string)
				.lean()
				.exec()) as TOutput | null;
		} catch (error: any) {
			console.error(`Error finding document: ${error.message}`);
			throw new MongoError(`Error finding document: ${error.message}`);
		}
	}

	public async updateOne<K extends keyof TOutput>(
		query: QueryFilter<TOutput>,
		data: UpdateQuery<TInput>,
		options: QueryOptions<TInput>,
		select: SelectWithExcludeAndInclude<K>[],
	): Promise<Pick<TOutput, K> | null>;
	public async updateOne<S extends SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		data: UpdateQuery<TInput>,
		options?: QueryOptions<TInput>,
		select?: S,
	): Promise<SelectReturn<TOutput, S> | null>;

	public async updateOne<K extends keyof TOutput | SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		data: UpdateQuery<TInput>,
		options: QueryOptions<TInput> = {},
		select: SelectWithExcludeAndInclude<K>[] | K = '' as K,
	): Promise<TOutput | null> {
		try {
			const baseQuery = this.model.findOneAndUpdate(query, data, { returnDocument: 'after', ...options });

			if (Array.isArray(select)) {
				const projection = Object.fromEntries(select.map((field) => [field, 1]));
				return (await baseQuery.select(projection).lean().exec()) as TOutput | null;
			}

			return (await baseQuery
				.select(select as string)
				.lean()
				.exec()) as TOutput | null;
		} catch (error: any) {
			if (error.code === 11_000) throw new BadRequestException(duplicateKeyMessage(error));
			console.error(`Error updating document: ${error.message}`);
			throw new MongoError(`Error updating document: ${error.message}`);
		}
	}

	public async updateMany(
		query: QueryFilter<TOutput>,
		data: UpdateQuery<TInput>,
		options: UpdateOptions & MongooseUpdateQueryOptions<TInput> = {},
	): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number }> {
		try {
			return await this.model.updateMany(query, data, options).lean().exec();
		} catch (error: any) {
			console.error(`Error updating documents: ${error.message}`);
			throw new MongoError(`Error updating documents: ${error.message}`);
		}
	}

	public async deleteOne<K extends keyof TOutput>(
		query: QueryFilter<TOutput>,
		select: SelectWithExcludeAndInclude<K>[],
	): Promise<Pick<TOutput, K> | null>;
	public async deleteOne<S extends SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		select?: S,
	): Promise<SelectReturn<TOutput, S> | null>;

	public async deleteOne<K extends keyof TOutput | SelectType<TOutput>>(
		query: QueryFilter<TOutput>,
		select: SelectWithExcludeAndInclude<K>[] | K = '' as K,
	): Promise<TOutput | null> {
		try {
			const baseQuery = this.model.findOneAndDelete(query);

			if (Array.isArray(select)) {
				const projection = Object.fromEntries(select.map((field) => [field, 1]));
				return (await baseQuery.select(projection).lean().exec()) as TOutput | null;
			}

			return (await baseQuery
				.select(select as string)
				.lean()
				.exec()) as TOutput | null;
		} catch (error: any) {
			console.error(`Error deleting document: ${error.message}`);
			throw new MongoError(`Error deleting document: ${error.message}`);
		}
	}

	public async deleteMany(query: QueryFilter<TOutput>): Promise<{ acknowledged: boolean; deletedCount: number }> {
		try {
			return await this.model.deleteMany(query).lean().exec();
		} catch (error: any) {
			console.error(`Error deleting documents: ${error.message}`);
			throw new MongoError(`Error deleting documents: ${error.message}`);
		}
	}

	public async count(query: QueryFilter<TOutput>): Promise<number> {
		try {
			return await this.model.countDocuments(query).lean().exec();
		} catch (error: any) {
			console.error(`Error counting documents: ${error.message}`);
			throw new MongoError(`Error counting documents: ${error.message}`);
		}
	}

	public async exists(query: QueryFilter<TOutput>): Promise<boolean> {
		try {
			const count = await this.model.countDocuments(query, { limit: 1 }).lean().exec();
			return count > 0;
		} catch (error: any) {
			console.error(`Error checking if document exists: ${error.message}`);
			throw new MongoError(`Error checking if document exists: ${error.message}`);
		}
	}

	public async aggregate(pipeline: any[]): Promise<any[]> {
		try {
			return await this.model.aggregate(pipeline).exec();
		} catch (error: any) {
			console.error(`Error aggregating documents: ${error.message}`);
			throw new MongoError(`Error aggregating documents: ${error.message}`);
		}
	}
}
