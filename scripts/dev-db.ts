/**
 * Local MongoDB without Docker: runs the same mongod binary the test suite downloads, with data persisted in
 * `.data/mongo`. Usage: `bun run db` (leave it running), then `bun run dev`.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = resolve(import.meta.dirname, '../.data/mongo');
mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
	instance: { port: Number(process.env.MONGO_PORT ?? 27017), dbPath, storageEngine: 'wiredTiger' },
});

console.info(`MongoDB ready at ${server.getUri()} (data: ${dbPath})`);

const stop = async () => {
	await server.stop({ doCleanup: false });
	process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
