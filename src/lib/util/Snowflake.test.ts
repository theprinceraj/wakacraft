import { describe, expect, it } from 'vitest';

import { generateFlake } from './Snowflake';

describe('generateFlake', () => {
	it('never repeats within a process, even many ids in the same millisecond', () => {
		const ids = Array.from({ length: 4000 }, generateFlake);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('produces numeric ids that grow over time', async () => {
		const first = generateFlake();
		await new Promise((resolve) => setTimeout(resolve, 5));
		const later = generateFlake();
		expect(first).toMatch(/^\d+$/);
		expect(BigInt(later) > BigInt(first)).toBe(true);
	});
});
