import { describe, expect, it } from 'vitest';

import { addDays, eachDate, humanizeSeconds, localDateOf, localDayBounds, toHumanDuration, weekdayOf } from './Time';

describe('humanizeSeconds', () => {
	it.each([
		[0, '0 secs'],
		[1, '1 sec'],
		[59, '59 secs'],
		[60, '1 min'],
		[23 * 60 + 5, '23 mins'],
		[3600, '1 hr'],
		[3600 + 44 * 60, '1 hr 44 mins'],
		[4 * 3600 + 59 * 60 + 59, '4 hrs 59 mins'],
	])('%i seconds → %s', (seconds, text) => {
		expect(humanizeSeconds(seconds)).toBe(text);
	});
});

describe('toHumanDuration', () => {
	it('formats the WakaTime time block', () => {
		expect(toHumanDuration(7 * 3600 + 35 * 60 + 12.5)).toEqual({
			total_seconds: 27_312.5,
			digital: '7:35',
			decimal: '7.59',
			text: '7 hrs 35 mins',
			hours: 7,
			minutes: 35,
			seconds: 12,
		});
	});
});

describe('calendar helpers', () => {
	it('adds days across month and year ends', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
	});

	it('lists an inclusive date range', () => {
		expect(eachDate('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
	});

	it('knows the weekday', () => {
		expect(weekdayOf('2026-10-22')).toBe(4); // Thursday
	});
});

describe('timezones', () => {
	it('places an instant on the local date of the timezone', () => {
		// 2026-10-21T20:00:00Z is already Oct 22 in India (UTC+5:30).
		const instant = Date.UTC(2026, 9, 21, 20) / 1000;
		expect(localDateOf(instant, 'UTC')).toBe('2026-10-21');
		expect(localDateOf(instant, 'Asia/Kolkata')).toBe('2026-10-22');
	});

	it('gives local midnight bounds', () => {
		const { start, end } = localDayBounds('2026-10-22', 'Asia/Kolkata');
		expect(new Date(start * 1000).toISOString()).toBe('2026-10-21T18:30:00.000Z');
		expect(end - start).toBe(86_400);
	});

	it('handles a 25-hour DST fall-back day', () => {
		const { start, end } = localDayBounds('2026-11-01', 'America/New_York');
		expect(end - start).toBe(25 * 3600);
	});
});
