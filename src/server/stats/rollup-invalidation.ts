import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoRollupInvalidationService } from '@/lib/mongo/rollup-invalidation/rollup-invalidation.service';
import { addDays, eachDate, localDateOf } from '@/lib/util/Time';

/**
 * Drops cached day rollups that activity at these instants could belong to. Rollups are per timezone, and an instant
 * falls on its UTC date or one day either side of it in every timezone, so those dates cover all cached variants.
 * `until` extends each instant into a span (external durations can cover several days).
 *
 * The dates' generation is bumped *before* deleting, so a rollup being computed concurrently — which may have read
 * heartbeats before this activity landed — sees the bump and discards itself (see `loadDayTotals`).
 */
export async function invalidateRollups(userId: string, spans: { from: number; until?: number }[]): Promise<void> {
	const dates = new Set<string>();
	for (const { from, until = from } of spans) {
		for (const date of eachDate(addDays(localDateOf(from, 'UTC'), -1), addDays(localDateOf(until, 'UTC'), 1)))
			dates.add(date);
	}
	if (!dates.size) return;
	await mongoRollupInvalidationService.bump(userId, [...dates]);
	await mongoDailySummaryService.deleteMany({ userId, date: { $in: [...dates] } });
}
