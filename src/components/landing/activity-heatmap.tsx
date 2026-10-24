export const HEATMAP_WEEKS = 20;

/** Deterministic pseudo-random intensities, so the server markup is the same on every render. */
function intensities() {
	let seed = 7;
	const next = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	return Array.from({ length: HEATMAP_WEEKS * 7 }, (_, index) => {
		const weekend = index % 7 >= 5;
		const value = next();
		if (value < (weekend ? 0.6 : 0.15)) return 0;
		return Math.min(1, (weekend ? 0.3 : 0.45) + next() * 0.7);
	});
}

/** A year-at-a-glance grid of coding days in wakacraft orange, used as the homepage's visual tile. */
export function ActivityHeatmap({ className }: { className?: string }) {
	const cells = intensities();
	return (
		<div
			className={className}
			style={{
				display: 'grid',
				gridTemplateColumns: `repeat(${HEATMAP_WEEKS}, minmax(0, 1fr))`,
				gridAutoFlow: 'column',
				gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
				gap: 4,
			}}
			aria-hidden
		>
			{cells.map((value, index) => (
				<span
					key={index}
					className="aspect-square rounded-[3px]"
					style={{
						background: value ? 'var(--ember)' : 'oklch(1 0 0 / 6%)',
						opacity: value ? 0.2 + value * 0.8 : 1,
					}}
				/>
			))}
		</div>
	);
}
