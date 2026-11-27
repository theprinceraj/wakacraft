import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectMongo } from '@/lib/mongo/connection';
import { UpdateSettingsSchema } from '@/server/user/user.request.dto';
import { userProfileService } from '@/server/user/user-profile.service';

import { signUpTestUser } from './users';

let userId: string;

beforeAll(async () => {
	await connectMongo();
	const { user } = await signUpTestUser({
		body: { email: 'partial@wakacraft.test', password: 'correct-horse-battery', name: 'partial' },
	});
	userId = user.id;
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('partial settings updates', () => {
	it('does not fill in defaults for fields the request leaves out', () => {
		expect(UpdateSettingsSchema.parse({ bio: 'hi' })).toEqual({ bio: 'hi' });
	});

	it('keeps privacy flags when another form saves', async () => {
		const save = (body: unknown) => userProfileService.updateSettings(userId, UpdateSettingsSchema.parse(body));

		await save({ loggedTimePublic: true, languagesUsedPublic: true, isPhotoPublic: false });
		// What the Preferences form and the welcome screen send on their own.
		const profile = await save({ timezone: 'Europe/Berlin', weekStartDay: 1 });

		expect(profile).toMatchObject({
			timezone: 'Europe/Berlin',
			weekStartDay: 1,
			loggedTimePublic: true,
			languagesUsedPublic: true,
			isPhotoPublic: false,
		});
	});
});
