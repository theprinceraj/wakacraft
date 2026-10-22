/** Billable seconds: rounded up to the client's increment (0 = exact). */
export function billableSeconds(seconds: number, roundingMinutes: number): number {
	if (seconds <= 0) return 0;
	if (!roundingMinutes) return Math.round(seconds);
	const step = roundingMinutes * 60;
	return Math.ceil(seconds / step) * step;
}

/** Amount in major currency units, rounded to cents. */
export const amountFor = (billedSeconds: number, hourlyRate: number) =>
	Math.round((billedSeconds / 3600) * hourlyRate * 100) / 100;

export function buildLineItems(
	projects: { name: string; seconds: number }[],
	{ hourlyRate, roundingMinutes }: { hourlyRate: number; roundingMinutes: number },
) {
	const lineItems = projects
		.filter((project) => project.seconds > 0)
		.map((project) => {
			const billed = billableSeconds(project.seconds, roundingMinutes);
			return {
				project: project.name,
				seconds: Math.round(project.seconds),
				billedSeconds: billed,
				hourlyRate,
				amount: amountFor(billed, hourlyRate),
			};
		})
		.sort((a, b) => b.amount - a.amount || a.project.localeCompare(b.project));
	// Sum in cents so the total always equals the sum of the displayed line amounts.
	const total = lineItems.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
	return { lineItems, total };
}

export const formatInvoiceNumber = (number: number) => `INV-${String(number).padStart(4, '0')}`;
