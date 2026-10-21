import { MongoMemoryServer } from 'mongodb-memory-server';

/** One throwaway mongod for the whole test run; workers inherit the URI through the environment. */
export default async function setup() {
	const server = await MongoMemoryServer.create();
	process.env.MONGODB_URI = server.getUri();
	process.env.MONGODB_DB = 'wakacraft-test';
	process.env.BETTER_AUTH_SECRET ??= 'test-secret-test-secret-test-secret-123';
	process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';

	return async () => {
		await server.stop();
	};
}
