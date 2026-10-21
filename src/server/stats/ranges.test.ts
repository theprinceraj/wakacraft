import { describe, expect, it } from 'vitest';

import { resolveStatsRange, resolveSummaryRange } from './ranges';

// Thursday.
const TODAY = '2026-10-22';

describe('resolveSummaryRange', () => {
	it.each([
		['Today', '2026-10-22', '2026-10-22'],
		['Yesterday', '2026-10-21', '2026-10-21'],
		['Last 7 Days', '2026-10-16', '2026-10-22'],
		['Last 7 Days from Yesterday', '2026-10-15', '2026-10-21'],
		['Last 14 Days', '2026-10-09', '2026-10-22'],
		['Last 30 Days', '2026-09-23', '2026-10-22'],
		['This Week', '2026-10-19', '2026-10-22'],
		['Last Week', '2026-10-12', '2026-10-18'],
		['This Month', '2026-10-01', '2026-10-22'],
		['Last Month', '2026-09-01', '2026-09-30'],
	] as const)('%s → %s..%s (week starts Monday)', (name, start, end) => {
		expect(resolveSummaryRange(name, TODAY, 1)).toMatchObject({ start, end });
	});

	it('respects a Sunday week start', () => {
		expect(resolveSummaryRange('This Week', TODAY, 0)).toMatchObject({ start: '2026-10-18', end: TODAY });
	});

	it('handles last month across a year boundary', () => {
		expect(resolveSummaryRange('Last Month', '2027-01-05', 1)).toMatchObject({
			start: '2026-12-01',
			end: '2026-12-31',
		});
	});
});

describe('resolveStatsRange', () => {
	it('resolves relative ranges ending today', () => {
		expect(resolveStatsRange('last_7_days', TODAY, null)).toEqual({
			start: '2026-10-16',
			end: TODAY,
			text: 'Last 7 Days',
		});
		expect(resolveStatsRange('last_30_days', TODAY, null).start).toBe('2026-09-23');
	});

	it('starts all_time at the first activity', () => {
		expect(resolveStatsRange('all_time', TODAY, '2025-03-14')).toMatchObject({ start: '2025-03-14', end: TODAY });
	});

	it('clips the current year and month to today', () => {
		expect(resolveStatsRange('2026', TODAY, null)).toMatchObject({ start: '2026-01-01', end: TODAY });
		expect(resolveStatsRange('2026-10', TODAY, null)).toEqual({
			start: '2026-10-01',
			end: TODAY,
			text: 'October 2026',
		});
	});

	it('returns a whole past month', () => {
		expect(resolveStatsRange('2026-02', TODAY, null)).toMatchObject({ start: '2026-02-01', end: '2026-02-28' });
	});
});
