import { describe, expect, it } from 'vitest';

import { durationTicks, formatAxisDuration, formatCategory, formatRangeLabel, initialsOf } from './format';

const HOUR = 3600;

describe('durationTicks', () => {
	it('still gives an axis when there is no data', () => {
		expect(durationTicks(0)).toEqual([0, 900]);
	});

	it('uses round steps from zero up to at least the maximum', () => {
		expect(durationTicks(4.4 * HOUR)).toEqual([0, 2, 4, 6].map((hours) => hours * HOUR));
		expect(durationTicks(40 * 60)).toEqual([0, 15, 30, 45].map((minutes) => minutes * 60));
	});

	it('does not add an empty step when the maximum lands on a tick', () => {
		expect(durationTicks(4 * HOUR).at(-1)).toBe(4 * HOUR);
	});

	it('keeps at most a handful of ticks above the largest named step', () => {
		const ticks = durationTicks(10_000 * HOUR);
		expect(ticks.length).toBeLessThanOrEqual(5);
		expect(ticks.at(-1)).toBeGreaterThanOrEqual(10_000 * HOUR);
	});
});

describe('formatAxisDuration', () => {
	it('labels ticks in the clearest unit', () => {
		expect(formatAxisDuration(0)).toBe('0h');
		expect(formatAxisDuration(1800)).toBe('30m');
		expect(formatAxisDuration(2 * HOUR)).toBe('2h');
		expect(formatAxisDuration(1.5 * HOUR)).toBe('1.5h');
	});
});

describe('display names', () => {
	it('sentence-cases API range names', () => {
		expect(formatRangeLabel('Last 7 Days')).toBe('Last 7 days');
		expect(formatRangeLabel('Today')).toBe('Today');
	});

	it('capitalizes categories and keeps AI as an acronym', () => {
		expect(formatCategory('code reviewing')).toBe('Code reviewing');
		expect(formatCategory('ai coding')).toBe('AI coding');
		expect(formatCategory('email')).toBe('Email');
	});

	it('builds initials from up to two words', () => {
		expect(initialsOf('Alex Rivera')).toBe('AR');
		expect(initialsOf('Priya')).toBe('P');
		expect(initialsOf('Mary Jane Watson')).toBe('MJ');
	});
});
