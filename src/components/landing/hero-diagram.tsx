import { Check } from 'lucide-react';

/** Editors branch off a spine into one dashboard: the homepage's picture of "every plugin, one place". */
const SPINE_X = 280;
const CARD_TOP = 318;

const EDITORS: { name: string; y: number; side: 'left' | 'right'; dot: string }[] = [
	{ name: 'VS Code', y: 36, side: 'left', dot: 'oklch(0.6 0.15 245)' },
	{ name: 'Cursor', y: 76, side: 'right', dot: 'oklch(0.3 0.03 268)' },
	{ name: 'JetBrains', y: 116, side: 'left', dot: 'oklch(0.6 0.22 350)' },
	{ name: 'Neovim', y: 156, side: 'right', dot: 'oklch(0.65 0.17 145)' },
	{ name: 'Zed', y: 196, side: 'left', dot: 'oklch(0.55 0.18 280)' },
	{ name: 'Xcode', y: 236, side: 'right', dot: 'oklch(0.68 0.13 230)' },
	{ name: '100+ more', y: 276, side: 'left', dot: 'var(--ember)' },
];

/** A made-up month of coding hours for the preview card, against a quieter previous month. */
const THIS_PERIOD = [
	3.1, 2.4, 4.2, 3.8, 1.2, 0.4, 3.6, 4.4, 3.9, 5.1, 2.8, 0.8, 0.2, 4.1, 3.3, 6.2, 4.6, 3.7, 1.4, 0.6, 4.8, 3.9, 4.3,
	5.4, 3.2, 1.1, 0.5, 4.2,
];
const LAST_PERIOD = [
	2.2, 2.8, 2.5, 3.1, 1.8, 0.9, 2.4, 2.9, 3.2, 2.6, 2.1, 1.0, 0.7, 2.8, 3.0, 3.4, 2.7, 2.5, 1.6, 0.8, 2.9, 3.1, 2.6,
	3.3, 2.4, 1.2, 0.9, 2.7,
];

function sparkline(values: number[], width: number, height: number) {
	const max = 7;
	const step = width / (values.length - 1);
	return values
		.map(
			(value, index) =>
				`${index ? 'L' : 'M'}${(index * step).toFixed(1)},${(height - (value / max) * height).toFixed(1)}`,
		)
		.join(' ');
}

export function HeroDiagram() {
	return (
		<div className="relative h-[480px] w-[560px]" aria-hidden>
			<svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 560 480" fill="none">
				<path id="landing-spine" d={`M${SPINE_X} 0 V${CARD_TOP}`} stroke="var(--border)" strokeWidth="1.5" />
				{EDITORS.map(({ name, y, side }) => (
					<path
						key={name}
						d={side === 'left' ? `M${SPINE_X} ${y} H240` : `M${SPINE_X} ${y} H320`}
						stroke="var(--border)"
						strokeWidth="1.5"
					/>
				))}
				<circle r="4" fill="var(--ember)" className="motion-reduce:hidden">
					<animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
						<mpath href="#landing-spine" />
					</animateMotion>
				</circle>
			</svg>

			{EDITORS.map(({ name, y, side, dot }) => (
				<span
					key={name}
					className="absolute flex h-[30px] -translate-y-1/2 items-center gap-2 rounded-full border bg-background px-3 text-xs font-medium shadow-[0_1px_2px_oklch(0.23_0.05_268/6%)]"
					style={side === 'left' ? { top: y, right: 560 - 240 } : { top: y, left: 320 }}
				>
					<span className="size-2 rounded-full" style={{ background: dot }} />
					{name}
				</span>
			))}

			<div
				className="absolute w-[420px] rounded-2xl border bg-background p-4 shadow-[0_12px_32px_-12px_oklch(0.23_0.05_268/22%)]"
				style={{ top: CARD_TOP, left: SPINE_X - 210 }}
			>
				<span className="absolute -top-3 -right-3 grid size-7 place-items-center rounded-full bg-ember text-primary-foreground">
					<Check className="size-4" strokeWidth={3} />
				</span>
				<div className="grid grid-cols-3 divide-x border-b pb-3 text-xs">
					{[
						['Today', '4h 12m'],
						['This week', '23h 40m'],
						['Top language', 'TypeScript'],
					].map(([label, value], index) => (
						<div key={label} className={index ? 'pl-3' : ''}>
							<p className={index ? 'text-muted-foreground' : 'font-medium text-ember'}>{label}</p>
							<p className="mt-0.5 text-lg font-semibold tracking-tight">{value}</p>
						</div>
					))}
				</div>
				<svg viewBox="0 0 388 64" className="mt-3 h-16 w-full" fill="none" preserveAspectRatio="none">
					<path
						d={sparkline(LAST_PERIOD, 388, 64)}
						stroke="var(--muted-foreground)"
						strokeOpacity="0.45"
						strokeDasharray="3 3"
					/>
					<path d={sparkline(THIS_PERIOD, 388, 64)} stroke="var(--ember)" strokeWidth="2" strokeLinejoin="round" />
				</svg>
				<div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span className="h-0.5 w-3 rounded-full bg-ember" /> Last 28 days
					</span>
					<span className="flex items-center gap-1.5">
						<span className="h-0 w-3 border-t border-dashed border-muted-foreground" /> Previous period
					</span>
				</div>
			</div>
		</div>
	);
}
