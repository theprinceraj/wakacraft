import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { LeaderboardSchema, LeaderboardSchemaName } from '../schemas/leaderboard.schema';

import type { ILeaderboardZodSchema, ILeaderboardZodSchemaInput } from '../zod';

export class MongoLeaderboardService extends MongoBaseService<ILeaderboardZodSchemaInput, ILeaderboardZodSchema> {
	public readonly model = registerModel<ILeaderboardZodSchemaInput, ILeaderboardZodSchema>(
		LeaderboardSchemaName,
		LeaderboardSchema,
	);
}

export const mongoLeaderboardService = new MongoLeaderboardService();
