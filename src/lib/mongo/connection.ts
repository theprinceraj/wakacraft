import mongoose, { type Model, type Schema } from 'mongoose';

import { DB_NAME } from '../util/Constants';

// Serverless functions and dev hot-reload re-evaluate modules; keep one connection per process.
const globalForMongo = globalThis as unknown as { mongoConnection?: Promise<typeof mongoose> };

export function connectMongo(): Promise<typeof mongoose> {
	if (!globalForMongo.mongoConnection) {
		const uri = process.env.MONGODB_URI;
		if (!uri) throw new Error('MONGODB_URI is not set');

		globalForMongo.mongoConnection = mongoose
			.connect(uri, {
				dbName: DB_NAME,
				maxPoolSize: 10,
				minPoolSize: 0,
				serverSelectionTimeoutMS: 10_000,
				socketTimeoutMS: 45_000,
				maxIdleTimeMS: 60_000,
			})
			.catch((error: unknown) => {
				// Let the next request retry instead of caching a rejected promise forever.
				globalForMongo.mongoConnection = undefined;
				throw error;
			});
	}

	return globalForMongo.mongoConnection;
}

/**
 * Registers a model once per process. In development the model is rebuilt on every evaluation so that
 * schema edits apply on hot reload instead of throwing `OverwriteModelError`.
 */
export function registerModel<TInput, TOutput>(name: string, schema: Schema<any>): Model<TInput, TOutput> {
	if (mongoose.models[name]) {
		if (process.env.NODE_ENV === 'production') return mongoose.models[name] as unknown as Model<TInput, TOutput>;
		mongoose.deleteModel(name);
	}

	return mongoose.model(name, schema) as unknown as Model<TInput, TOutput>;
}
