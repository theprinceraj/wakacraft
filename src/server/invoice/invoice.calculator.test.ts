import { describe, expect, it } from 'vitest';

import { amountFor, billableSeconds, buildLineItems, formatInvoiceNumber } from './invoice.calculator';

describe('billableSeconds', () => {
	it('rounds up to the increment', () => {
		expect(billableSeconds(61 * 60, 15)).toBe(75 * 60);
		expect(billableSeconds(60 * 60, 15)).toBe(60 * 60);
		expect(billableSeconds(1, 6)).toBe(6 * 60);
	});

	it('is exact without rounding, and zero for no time', () => {
		expect(billableSeconds(3725.4, 0)).toBe(3725);
		expect(billableSeconds(0, 15)).toBe(0);
	});
});

describe('buildLineItems', () => {
	it('prices each project and totals in cents', () => {
		const { lineItems, total } = buildLineItems(
			[
				{ name: 'web', seconds: 3600 },
				{ name: 'api', seconds: 5400 },
				{ name: 'idle', seconds: 0 },
			],
			{ hourlyRate: 85.5, roundingMinutes: 0 },
		);
		expect(lineItems.map((item) => [item.project, item.amount])).toEqual([
			['api', 128.25],
			['web', 85.5],
		]);
		expect(total).toBe(213.75);
	});

	it('keeps the total equal to the sum of rounded line amounts', () => {
		const { lineItems, total } = buildLineItems(
			[
				{ name: 'a', seconds: 1000 },
				{ name: 'b', seconds: 1000 },
				{ name: 'c', seconds: 1000 },
			],
			{ hourlyRate: 10, roundingMinutes: 0 },
		);
		expect(amountFor(1000, 10)).toBe(2.78);
		expect(total).toBe(lineItems.reduce((sum, item) => sum + item.amount, 0));
		expect(total).toBe(8.34);
	});
});

describe('formatInvoiceNumber', () => {
	it('pads to four digits', () => {
		expect(formatInvoiceNumber(7)).toBe('INV-0007');
		expect(formatInvoiceNumber(12_345)).toBe('INV-12345');
	});
});
