import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { inBatches } from '@/lib/util/Async';
import { addDays, todayIn } from '@/lib/util/Time';

import { loadDayTotals } from './day-totals';
import { statsService } from './stats.service';

/** Users active this recently get their yesterday pre-built; anyone else has nothing new to roll up. */
const ACTIVE_WITHIN_DAYS = 3;
const CONCURRENCY = 8;

class PrebuildService {
	/**
	 * Builds and caches each recently active user's yesterday (in their own timezone), so the first dashboard view of
	 * the day reads rollups instead of heartbeats. Days already cached cost one lookup.
	 */
	public async prebuildYesterday(now = Date.now()): Promise<{ users: number }> {
		const since = new Date(now - ACTIVE_WITHIN_DAYS * 86_400_000);
		const profiles = await mongoUserProfileService.find({ lastHeartbeatAt: { $gte: since } }, ['userId']);
		await inBatches(profiles, CONCURRENCY, async ({ userId }) => {
			const settings = await statsService.resolveSettings(userId);
			await loadDayTotals(userId, [addDays(todayIn(settings.timezone), -1)], settings);
		});
		return { users: profiles.length };
	}
}

export const prebuildService = new PrebuildService();
