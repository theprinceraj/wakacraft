const PALETTE_SIZE = 8;

/** Series colors cycle the 7 accent chart tokens; `--chart-8` (muted) is reserved for "Other". */
export function seriesColor(index: number, name?: string): string {
	if (name === 'Other') return 'var(--chart-8)';
	return `var(--chart-${(index % (PALETTE_SIZE - 1)) + 1})`;
}

/** A project's own color when the user picked one, else its slot in the palette. */
export function projectColor(name: string, index: number, colors: Record<string, string | null>): string {
	return colors[name] ?? seriesColor(index, name);
}
