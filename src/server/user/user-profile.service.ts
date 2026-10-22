import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { NotFoundException } from '@/lib/http/errors';

import type { IUserProfileZodSchema } from '@/lib/mongo/zod';
import type { UpdateSettingsInput } from './user.request.dto';

class UserProfileService {
	/** Idempotent: creates the profile with schema defaults on first call, returns the existing one after. */
	public async ensureProfile(userId: string): Promise<IUserProfileZodSchema> {
		const profile = await mongoUserProfileService.updateOne(
			{ userId },
			{ $setOnInsert: { userId } },
			{ upsert: true, setDefaultsOnInsert: true },
		);
		return profile!;
	}

	public async getProfile(userId: string): Promise<IUserProfileZodSchema> {
		return (await mongoUserProfileService.findOne({ userId })) ?? this.ensureProfile(userId);
	}

	public async findByUsername(username: string): Promise<IUserProfileZodSchema | null> {
		return mongoUserProfileService.findOne({ username: username.toLowerCase() });
	}

	public async updateSettings(userId: string, input: UpdateSettingsInput): Promise<IUserProfileZodSchema> {
		await this.ensureProfile(userId);
		const profile = await mongoUserProfileService.updateOne({ userId }, { $set: input });
		if (!profile) throw new NotFoundException('Profile not found');
		return profile;
	}

	public async recordActivity(
		userId: string,
		activity: Pick<IUserProfileZodSchema, 'lastHeartbeatAt' | 'lastPlugin' | 'lastProject' | 'lastBranch'>,
	): Promise<void> {
		await mongoUserProfileService.updateMany(
			{
				userId,
				$or: [{ lastHeartbeatAt: { $exists: false } }, { lastHeartbeatAt: { $lt: activity.lastHeartbeatAt } }],
			},
			{ $set: activity },
		);
	}
}

export const userProfileService = new UserProfileService();
