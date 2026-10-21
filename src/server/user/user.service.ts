import { auth } from '@/lib/auth/auth';
import { NotFoundException } from '@/lib/http/errors';

import { userProfileService } from './user-profile.service';
import { toUserResponse, type UserResponse } from './user.response.dto';

import type { UpdateSettingsInput } from './user.request.dto';

class UserService {
	public async getCurrentUser(userId: string): Promise<UserResponse> {
		const [profile, context] = await Promise.all([userProfileService.getProfile(userId), auth.$context]);
		const authUser = await context.internalAdapter.findUserById(userId);
		if (!authUser) throw new NotFoundException('User not found');

		return toUserResponse(profile, {
			name: authUser.name ?? null,
			email: authUser.email ?? null,
			emailVerified: Boolean(authUser.emailVerified),
			image: authUser.image ?? null,
		});
	}

	public async updateSettings(userId: string, input: UpdateSettingsInput): Promise<UserResponse> {
		await userProfileService.updateSettings(userId, input);
		return this.getCurrentUser(userId);
	}
}

export const userService = new UserService();
