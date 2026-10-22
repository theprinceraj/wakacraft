import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { LeaderboardCacheSchema, LeaderboardCacheSchemaName } from '../schemas/leaderboard-cache.schema';

import type { ILeaderboardCacheZodSchema, ILeaderboardCacheZodSchemaInput } from '../zod';

export class MongoLeaderboardCacheService extends MongoBaseService<
	ILeaderboardCacheZodSchemaInput,
	ILeaderboardCacheZodSchema
> {
	public readonly model = registerModel<ILeaderboardCacheZodSchemaInput, ILeaderboardCacheZodSchema>(
		LeaderboardCacheSchemaName,
		LeaderboardCacheSchema,
	);
}

export const mongoLeaderboardCacheService = new MongoLeaderboardCacheService();
