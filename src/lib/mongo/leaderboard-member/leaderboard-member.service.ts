import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { LeaderboardMemberSchema, LeaderboardMemberSchemaName } from '../schemas/leaderboard-member.schema';

import type { ILeaderboardMemberZodSchema, ILeaderboardMemberZodSchemaInput } from '../zod';

export class MongoLeaderboardMemberService extends MongoBaseService<
	ILeaderboardMemberZodSchemaInput,
	ILeaderboardMemberZodSchema
> {
	public readonly model = registerModel<ILeaderboardMemberZodSchemaInput, ILeaderboardMemberZodSchema>(
		LeaderboardMemberSchemaName,
		LeaderboardMemberSchema,
	);
}

export const mongoLeaderboardMemberService = new MongoLeaderboardMemberService();
