import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export function StatTile({
	label,
	value,
	hint,
	delta,
	accent = false,
}: {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	/** Fractional change vs. the comparison period; `null` hides the indicator. */
	delta?: number | null;
	accent?: boolean;
}) {
	const direction =
		delta === undefined || delta === null ? null : delta > 0.005 ? 'up' : delta < -0.005 ? 'down' : 'flat';
	const DeltaIcon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

	return (
		<div
			className={cn(
				'relative flex min-w-0 flex-col justify-between gap-2 overflow-hidden rounded-lg border bg-card/80 px-3.5 py-3',
				accent &&
					'border-ember/30 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklch,var(--ember)_14%,transparent),transparent_60%)]',
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="text-[10.5px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
				{direction ? (
					<span
						className={cn(
							'tabular inline-flex items-center gap-0.5 text-[11px]',
							direction === 'up' && 'text-success',
							direction === 'down' && 'text-destructive',
							direction === 'flat' && 'text-muted-foreground',
						)}
					>
						<DeltaIcon className="size-3" aria-hidden />
						{Math.abs(Math.round(delta! * 100))}%
					</span>
				) : null}
			</div>
			<div className={cn('tabular truncate text-[26px] leading-none font-semibold', accent && 'text-ember')}>
				{value}
			</div>
			{hint ? <div className="truncate text-[11px] text-muted-foreground">{hint}</div> : null}
		</div>
	);
}
