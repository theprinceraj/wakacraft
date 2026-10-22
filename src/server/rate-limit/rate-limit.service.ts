import { TooManyRequestsException } from '@/lib/http/errors';
import { mongoRateLimitService } from '@/lib/mongo/rate-limit/rate-limit.service';

interface Limit {
	/** Units allowed per window. */
	limit: number;
	windowSeconds: number;
}

/**
 * Heartbeats per user per window. Live coding sends a few a minute; wakatime-cli's offline sync replays its queue in
 * bulk requests of 25, so the window is generous enough for a full backlog and only stops runaway clients.
 */
export const LIMITS = {
	heartbeats: { limit: 5000, windowSeconds: 600 },
} satisfies Record<string, Limit>;

export type RateLimitBucket = keyof typeof LIMITS;

class RateLimitService {
	/** Counts `units` against the user's current window; throws 429 with `Retry-After` once it is exceeded. */
	public async consume(userId: string, bucket: RateLimitBucket, units = 1, now = Date.now()) {
		const { limit, windowSeconds } = LIMITS[bucket];
		const windowMs = windowSeconds * 1000;
		const windowStart = Math.floor(now / windowMs) * windowMs;
		const windowEnd = windowStart + windowMs;
		const count = await mongoRateLimitService.increment(
			`${bucket}:${userId}:${windowStart}`,
			units,
			new Date(windowEnd),
		);
		if (count > limit) {
			throw new TooManyRequestsException(
				`Rate limit exceeded: at most ${limit} ${bucket} per ${windowSeconds / 60} minutes`,
				Math.ceil((windowEnd - now) / 1000),
			);
		}
	}
}

export const rateLimitService = new RateLimitService();
