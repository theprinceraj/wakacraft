import { TooManyRequestsException } from '@/lib/http/errors';
import { mongoRateLimitService } from '@/lib/mongo/rate-limit/rate-limit.service';

interface Limit {
	/** Units allowed per window. */
	limit: number;
	windowSeconds: number;
}

/**
 * Fixed windows per caller: the user id when signed in, the client IP otherwise. Every limit sits far above what a real
 * client does, so only runaway scripts and scrapers ever see a 429.
 */
export const LIMITS = {
	/**
	 * Heartbeats. Live coding sends a few a minute; wakatime-cli's offline sync replays its queue in bulk requests of
	 * 25, so the window is generous enough for a full backlog and only stops runaway clients.
	 */
	heartbeats: { limit: 5000, windowSeconds: 600 },
	/**
	 * Requests to the aggregating reads (summaries, durations, stats, insights, goals, all-time, status bar). Plugins
	 * run wakatime-cli `--today` about once a minute per editor window and status-bar widgets poll on a similar
	 * cadence, so even ten open editors plus a widget stay near 120 per window: 1200 (2/s sustained) is 10x that.
	 */
	aggregate: { limit: 1200, windowSeconds: 600 },
	/** API key creations. People make a handful, ever; 20 an hour leaves room for a key per machine in one sitting. */
	api_keys: { limit: 20, windowSeconds: 3600 },
	/**
	 * Import requests: starting a WakaTime import, and each upload batch. The settings page sends 500 heartbeats per
	 * batch, so 2000 an hour moves a million heartbeats (years of history) in one go.
	 */
	imports: { limit: 2000, windowSeconds: 3600 },
	/** Export creations and downloads. Each scans the whole history; nobody needs more than a few a day. */
	data_dumps: { limit: 30, windowSeconds: 3600 },
	/**
	 * Anonymous, uncached public reads (shareable charts, README badges), per IP. Badges are fetched through proxies
	 * such as GitHub's camo, which funnel many readers through few IPs, so this is set well above one person's use.
	 */
	public: { limit: 3000, windowSeconds: 600 },
} satisfies Record<string, Limit>;

export type RateLimitBucket = keyof typeof LIMITS;

class RateLimitService {
	/**
	 * Counts `units` against the caller's current window (`userId`, or `ip:<address>` for anonymous callers); throws
	 * 429 with `Retry-After` once it is exceeded.
	 */
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
