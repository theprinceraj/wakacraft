import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { addDays, eachDate, localDateOf } from '@/lib/util/Time';

/**
 * Drops cached day rollups that activity at these instants could belong to. Rollups are per timezone, and an instant
 * falls on its UTC date or one day either side of it in every timezone, so those dates cover all cached variants.
 * `until` extends each instant into a span (external durations can cover several days).
 */
export async function invalidateRollups(userId: string, spans: { from: number; until?: number }[]): Promise<void> {
	const dates = new Set<string>();
	for (const { from, until = from } of spans) {
		for (const date of eachDate(addDays(localDateOf(from, 'UTC'), -1), addDays(localDateOf(until, 'UTC'), 1)))
			dates.add(date);
	}
	if (dates.size) await mongoDailySummaryService.deleteMany({ userId, date: { $in: [...dates] } });
}
