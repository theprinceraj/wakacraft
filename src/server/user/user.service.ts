import { auth } from '@/lib/auth/auth';
import { NotFoundException, UnauthorizedException } from '@/lib/http/errors';

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

	/**
	 * Refuses with 401 once the Better Auth user is gone. A deleted account's other devices keep a cookie-cached session
	 * for up to `session.cookieCache.maxAge`; anything that issues a credential checks this so none outlives the account.
	 */
	public async assertExists(userId: string): Promise<void> {
		if (!(await this.exists(userId))) throw new UnauthorizedException('This account no longer exists');
	}

	/** Whether the Better Auth user still exists (read from the database, never a cached session). */
	public async exists(userId: string): Promise<boolean> {
		return Boolean(await (await auth.$context).internalAdapter.findUserById(userId));
	}

	public async updateSettings(userId: string, input: UpdateSettingsInput): Promise<UserResponse> {
		await userProfileService.updateSettings(userId, input);
		return this.getCurrentUser(userId);
	}
}

export const userService = new UserService();
