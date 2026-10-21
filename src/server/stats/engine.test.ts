import { describe, expect, it } from 'vitest';

import { computeDurations, computeTotals, creditSeconds, mergeStatTotals, type EngineHeartbeat } from './engine';

const TIMEOUT = 15 * 60;

const hb = (time: number, overrides: Partial<EngineHeartbeat> = {}): EngineHeartbeat => ({
	time,
	entity: '/src/app.ts',
	category: 'coding',
	project: 'api',
	language: 'TypeScript',
	editor: 'VS Code',
	operatingSystem: 'Windows',
	machine: 'laptop',
	...overrides,
});

describe('creditSeconds', () => {
	it('credits the gap to the next heartbeat when it is within the timeout', () => {
		expect(creditSeconds([hb(0), hb(120), hb(300)], { timeoutSeconds: TIMEOUT, rangeEnd: 10_000 })).toEqual([
			120, 180, 0,
		]);
	});

	it('credits nothing across a gap longer than the timeout (the user stopped)', () => {
		expect(creditSeconds([hb(0), hb(901)], { timeoutSeconds: TIMEOUT, rangeEnd: 10_000 })).toEqual([0, 0]);
	});

	it('counts a gap of exactly the timeout', () => {
		expect(creditSeconds([hb(0), hb(900)], { timeoutSeconds: TIMEOUT, rangeEnd: 10_000 })).toEqual([900, 0]);
	});

	it('measures the last gap against the first heartbeat after the range, clipped at the range end', () => {
		// 23:58 → 00:03 next day: only the 2 minutes before midnight belong to this day.
		const credits = creditSeconds([hb(86_400 - 120)], {
			timeoutSeconds: TIMEOUT,
			rangeEnd: 86_400,
			nextAfterRange: { time: 86_400 + 180 },
		});
		expect(credits).toEqual([120]);
	});

	it('ignores duplicate timestamps', () => {
		expect(creditSeconds([hb(10), hb(10)], { timeoutSeconds: TIMEOUT, rangeEnd: 100 })).toEqual([0, 0]);
	});
});

describe('computeDurations', () => {
	it('merges consecutive same-project heartbeats and splits when the project changes', () => {
		const durations = computeDurations(
			[hb(0), hb(60), hb(120, { project: 'web' }), hb(180, { project: 'web' })],
			'project',
			{ timeoutSeconds: TIMEOUT, rangeEnd: 10_000 },
		);

		expect(durations.map(({ key, start, duration }) => ({ key, start, duration }))).toEqual([
			{ key: 'api', start: 0, duration: 120 },
			{ key: 'web', start: 120, duration: 60 },
		]);
	});

	it('starts a new block after a break longer than the timeout', () => {
		const durations = computeDurations([hb(0), hb(60), hb(5_000), hb(5_030)], 'project', {
			timeoutSeconds: TIMEOUT,
			rangeEnd: 10_000,
		});

		expect(durations.map(({ start, duration }) => ({ start, duration }))).toEqual([
			{ start: 0, duration: 60 },
			{ start: 5_000, duration: 30 },
		]);
	});

	it('slices by language while keeping the project on each block', () => {
		const durations = computeDurations([hb(0), hb(60, { language: 'CSS' }), hb(90, { language: 'CSS' })], 'language', {
			timeoutSeconds: TIMEOUT,
			rangeEnd: 10_000,
		});

		expect(durations.map(({ key, project, duration }) => ({ key, project, duration }))).toEqual([
			{ key: 'TypeScript', project: 'api', duration: 60 },
			{ key: 'CSS', project: 'api', duration: 30 },
		]);
	});

	it('uses the WakaTime placeholder for a heartbeat without a project', () => {
		const [duration] = computeDurations([hb(0, { project: null }), hb(30, { project: null })], 'project', {
			timeoutSeconds: TIMEOUT,
			rangeEnd: 100,
		});
		expect(duration.key).toBe('Unknown Project');
	});
});

describe('computeTotals', () => {
	it('sums credited time per dimension and sorts largest first', () => {
		const totals = computeTotals(
			[
				hb(0, { dependencies: ['react', 'zod'], branch: 'main' }),
				hb(100, { project: 'web', language: 'CSS', branch: 'main' }),
				hb(400, { project: 'web', language: 'CSS', category: 'debugging' }),
				hb(450),
			],
			{ timeoutSeconds: TIMEOUT, rangeEnd: 10_000 },
		);

		expect(totals.totalSeconds).toBe(450);
		expect(totals.projects.map((p) => [p.name, p.totalSeconds])).toEqual([
			['web', 350],
			['api', 100],
		]);
		expect(totals.languages.map((l) => [l.name, l.totalSeconds])).toEqual([
			['CSS', 350],
			['TypeScript', 100],
		]);
		expect(totals.categories.map((c) => [c.name, c.totalSeconds])).toEqual([
			['coding', 400],
			['debugging', 50],
		]);
		// Every dependency of a heartbeat gets that heartbeat's full credit.
		expect(totals.dependencies.map((d) => [d.name, d.totalSeconds])).toEqual([
			['react', 100],
			['zod', 100],
		]);
		expect(totals.branches.map((b) => [b.name, b.totalSeconds])).toEqual([['main', 400]]);
	});

	it('totals AI line changes, tokens and distinct AI sessions', () => {
		const totals = computeTotals(
			[
				hb(0, { aiLineChanges: 10, humanLineChanges: 2, aiSession: 's1', aiInputTokens: 100, aiOutputTokens: 50 }),
				hb(60, { aiLineChanges: 5, aiSession: 's1' }),
				hb(120, { humanLineChanges: 7, aiSession: 's2', aiCachedInputTokens: 30 }),
			],
			{ timeoutSeconds: TIMEOUT, rangeEnd: 10_000 },
		);

		expect(totals).toMatchObject({
			aiLineChanges: 15,
			humanLineChanges: 9,
			aiInputTokens: 100,
			aiCachedInputTokens: 30,
			aiOutputTokens: 50,
			aiSessions: 2,
		});
		expect(totals.projects[0]).toMatchObject({ name: 'api', aiLineChanges: 15, humanLineChanges: 9 });
	});

	it('splits credited time across local hour boundaries', () => {
		// UTC clock; 10:55 → 11:05 is 5 minutes in hour 10 and 5 in hour 11.
		const clock = (time: number) => ({ hour: Math.floor((time % 86_400) / 3600), secondsIntoHour: time % 3600 });
		const at = (hour: number, minute: number) => hour * 3600 + minute * 60;
		const totals = computeTotals([hb(at(10, 55)), hb(at(11, 5))], { timeoutSeconds: TIMEOUT, rangeEnd: 86_400, clock });

		expect(totals.hours[10]).toBe(300);
		expect(totals.hours[11]).toBe(300);
		expect(totals.hours.reduce((sum, seconds) => sum + seconds, 0)).toBe(totals.totalSeconds);
	});

	it('returns empty breakdowns for no heartbeats', () => {
		const totals = computeTotals([], { timeoutSeconds: TIMEOUT, rangeEnd: 10 });
		expect(totals.totalSeconds).toBe(0);
		expect(totals.projects).toEqual([]);
	});
});

describe('mergeStatTotals', () => {
	it('adds rows with the same name across days', () => {
		const merged = mergeStatTotals([
			[{ name: 'api', totalSeconds: 100, aiLineChanges: 1, humanLineChanges: 0 }],
			[
				{ name: 'web', totalSeconds: 300, aiLineChanges: 0, humanLineChanges: 0 },
				{ name: 'api', totalSeconds: 50, aiLineChanges: 2, humanLineChanges: 3 },
			],
		]);
		expect(merged).toEqual([
			{ name: 'web', totalSeconds: 300, aiLineChanges: 0, humanLineChanges: 0 },
			{ name: 'api', totalSeconds: 150, aiLineChanges: 3, humanLineChanges: 3 },
		]);
	});
});
