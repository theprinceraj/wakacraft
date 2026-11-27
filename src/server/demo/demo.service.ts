import { auth } from '@/lib/auth/auth';
import { BadRequestException } from '@/lib/http/errors';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoMachineService } from '@/lib/mongo/machine/machine.service';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { mongoRollupInvalidationService } from '@/lib/mongo/rollup-invalidation/rollup-invalidation.service';
import { mongoUserAgentService } from '@/lib/mongo/user-agent/user-agent.service';
import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { PUBLIC_ORIGIN } from '@/lib/public-origin';
import { addDays, todayIn } from '@/lib/util/Time';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { UsernameSchema } from '@/server/user/user.request.dto';
import { userProfileService } from '@/server/user/user-profile.service';

import { generateDay } from './demo.generator';

/** A reserved TLD can't receive mail, so no OAuth sign-in can ever link to this account. */
const DEMO_EMAIL = 'demo@demo.wakacraft.invalid';
const SEED_DAYS = 90;
const BATCH = 100;
const TOP_UP_DAYS = 3;

class DemoService {
	/** One date's synthetic heartbeats, through the normal ingestion pipeline. Returns how many were generated. */
	public async ingestDay(userId: string, date: string): Promise<number> {
		const day = generateDay(date);
		if (!day) return 0;
		for (let index = 0; index < day.heartbeats.length; index += BATCH) {
			await heartbeatService.ingest(userId, day.heartbeats.slice(index, index + BATCH), {
				userAgent: null,
				machineName: day.machineName,
			});
		}
		return day.heartbeats.length;
	}

	/**
	 * Creates or reuses the public demo user (no OAuth account, so nobody can sign in as it), then replaces its data
	 * with ~90 days of synthetic activity.
	 */
	public async seed(rawUsername: string): Promise<{ userId: string; heartbeats: number }> {
		// Format only: the demo's own name is exactly the one the reservation keeps from real accounts.
		const parsed = UsernameSchema.safeParse(rawUsername);
		if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid username');
		const username = parsed.data;
		const userId = await this.ensureUser(username);

		const owned = { userId };
		await mongoHeartbeatService.deleteMany(owned);
		await mongoProjectService.deleteMany(owned);
		await mongoMachineService.deleteMany(owned);
		await mongoUserAgentService.deleteMany(owned);
		await mongoDailySummaryService.deleteMany(owned);
		await mongoRollupInvalidationService.deleteMany(owned);

		const today = todayIn('UTC');
		let heartbeats = 0;
		for (let ago = SEED_DAYS; ago >= 1; ago--) heartbeats += await this.ingestDay(userId, addDays(today, -ago));
		// Today so far, so the profile's "last 7 days" reaches the present.
		heartbeats += await this.ingestDay(userId, today);
		// The public profile lists only projects marked public.
		await mongoProjectService.updateMany(owned, { $set: { hasPublicUrl: true } });
		return { userId, heartbeats };
	}

	/**
	 * Nightly top-up so the demo never goes stale: regenerates the last few days, so a missed night heals itself
	 * (generation is deterministic and ingestion dedups). A no-op unless the username belongs to the demo account.
	 * Returns how many heartbeats were generated, duplicates included.
	 */
	public async appendRecent(username: string | undefined): Promise<number> {
		if (!username) return 0;
		const profile = await userProfileService.findByUsername(username);
		if (!profile?.isDemo) return 0;
		const today = todayIn('UTC');
		let heartbeats = 0;
		for (let ago = TOP_UP_DAYS; ago >= 1; ago--)
			heartbeats += await this.ingestDay(profile.userId, addDays(today, -ago));
		return heartbeats;
	}

	private async ensureUser(username: string): Promise<string> {
		const taken = await userProfileService.findByUsername(username);
		if (taken && !taken.isDemo) throw new BadRequestException(`@${username} belongs to a real account`);

		let userId = taken?.userId;
		if (!userId) {
			const context = await auth.$context;
			const existing = await context.internalAdapter.findUserByEmail(DEMO_EMAIL);
			userId =
				existing?.user.id ??
				(
					await context.internalAdapter.createUser(
						{ email: DEMO_EMAIL, name: 'Demo', emailVerified: true },
						{ method: 'admin' },
					)
				).id;
		}

		await userProfileService.updateSettings(userId, {
			username,
			timezone: 'UTC',
			bio: 'A sample profile with synthetic activity, so you can see wakacraft without signing in.',
			website: PUBLIC_ORIGIN,
			loggedTimePublic: true,
			languagesUsedPublic: true,
			editorsUsedPublic: true,
			categoriesUsedPublic: true,
			osUsedPublic: true,
		});
		await mongoUserProfileService.updateOne({ userId }, { $set: { isDemo: true } });
		return userId;
	}
}

export const demoService = new DemoService();
