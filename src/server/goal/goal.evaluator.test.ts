import { describe, expect, it } from 'vitest';

import { goalPeriods, goalStreak, goalTitle, periodStatus, type GoalPeriod, type GoalRules } from './goal.evaluator';

const TODAY = '2026-10-22'; // Thursday
const HOUR = 3600;

const rules = (overrides: Partial<GoalRules> = {}): GoalRules => ({
	delta: 'day',
	seconds: 2 * HOUR,
	isInverse: false,
	ignoreDays: [],
	ignoreZeroDays: false,
	projects: [],
	languages: [],
	editors: [],
	categories: [],
	...overrides,
});

const day = (date: string) => ({ start: date, end: date });

describe('goalPeriods', () => {
	it('lists the last 14 days ending today', () => {
		const periods = goalPeriods('day', TODAY, 1);
		expect(periods).toHaveLength(14);
		expect(periods[0]).toEqual(day('2026-10-09'));
		expect(periods.at(-1)).toEqual(day(TODAY));
	});

	it('lists the last 8 weeks aligned to the week start', () => {
		const periods = goalPeriods('week', TODAY, 1);
		expect(periods).toHaveLength(8);
		expect(periods.at(-1)).toEqual({ start: '2026-10-19', end: '2026-10-25' });
		expect(periods[0]).toEqual({ start: '2026-08-31', end: '2026-09-06' });
	});
});

describe('periodStatus', () => {
	it('passes or fails a finished day', () => {
		expect(periodStatus(rules(), day('2026-10-21'), 2 * HOUR, TODAY).status).toBe('success');
		expect(periodStatus(rules(), day('2026-10-21'), HOUR, TODAY)).toEqual({ status: 'fail', reason: 'Short by 1 hr' });
	});

	it('keeps today pending until the goal is met', () => {
		expect(periodStatus(rules(), day(TODAY), HOUR, TODAY)).toEqual({ status: 'pending', reason: '1 hr to go' });
		expect(periodStatus(rules(), day(TODAY), 3 * HOUR, TODAY).status).toBe('success');
	});

	it('inverts for "at most" goals, failing today as soon as the limit is crossed', () => {
		const ceiling = rules({ isInverse: true });
		expect(periodStatus(ceiling, day('2026-10-21'), HOUR, TODAY).status).toBe('success');
		expect(periodStatus(ceiling, day('2026-10-21'), 3 * HOUR, TODAY).status).toBe('fail');
		expect(periodStatus(ceiling, day(TODAY), HOUR, TODAY).status).toBe('pending');
		expect(periodStatus(ceiling, day(TODAY), 3 * HOUR, TODAY).status).toBe('fail');
	});

	it('ignores configured weekdays and, optionally, zero days', () => {
		expect(periodStatus(rules({ ignoreDays: ['sunday'] }), day('2026-10-18'), 0, TODAY).status).toBe('ignored');
		expect(periodStatus(rules({ ignoreZeroDays: true }), day('2026-10-20'), 0, TODAY).status).toBe('ignored');
		expect(periodStatus(rules({ ignoreZeroDays: true }), day('2026-10-20'), 60, TODAY).status).toBe('fail');
	});

	it('evaluates the current week as pending until met', () => {
		const weekly = rules({ delta: 'week', seconds: 10 * HOUR });
		expect(periodStatus(weekly, { start: '2026-10-19', end: '2026-10-25' }, 4 * HOUR, TODAY).status).toBe('pending');
		expect(periodStatus(weekly, { start: '2026-10-12', end: '2026-10-18' }, 12 * HOUR, TODAY).status).toBe('success');
	});
});

describe('goalStreak', () => {
	const period = (status: GoalPeriod['status']): GoalPeriod => ({
		start: '',
		end: '',
		actualSeconds: 0,
		status,
		reason: '',
	});

	it('counts back from the latest decided period, skipping pending and ignored', () => {
		expect(
			goalStreak(
				['fail', 'success', 'ignored', 'success', 'success', 'pending'].map((s) => period(s as GoalPeriod['status'])),
			),
		).toBe(3);
	});

	it('is zero right after a failure', () => {
		expect(goalStreak([period('success'), period('fail')])).toBe(0);
	});
});

describe('goalTitle', () => {
	it('describes the goal', () => {
		expect(goalTitle(rules())).toBe('Code at least 2 hrs per day');
		expect(
			goalTitle(
				rules({
					delta: 'week',
					seconds: 10 * HOUR,
					isInverse: true,
					languages: ['Go', 'Rust', 'C'],
					projects: ['api'],
				}),
			),
		).toBe('Code at most 10 hrs per week in Go, Rust and C on api');
	});
});
