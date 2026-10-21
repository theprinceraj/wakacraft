import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

/**
 * The building block of the dashboard: a compact instrument panel with an uppercase eyebrow label, optional
 * right-side meta, and dense content. Panels sit on a 12-column grid.
 */
export function Panel({
	label,
	meta,
	children,
	className,
	bodyClassName,
}: {
	label: string;
	meta?: ReactNode;
	children: ReactNode;
	className?: string;
	bodyClassName?: string;
}) {
	return (
		<section
			className={cn(
				'relative flex min-w-0 flex-col rounded-lg border bg-card/80 shadow-[inset_0_1px_0_0_oklch(1_0_0/4%)] backdrop-blur-sm',
				className,
			)}
		>
			<header className="flex h-9 items-center justify-between gap-3 border-b px-3.5">
				<h2 className="text-[10.5px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</h2>
				{meta ? <div className="tabular text-[11px] text-muted-foreground">{meta}</div> : null}
			</header>
			<div className={cn('flex-1 p-3.5', bodyClassName)}>{children}</div>
		</section>
	);
}

export function PanelEmpty({ children = 'No activity in this range' }: { children?: ReactNode }) {
	return (
		<div className="flex h-full min-h-24 items-center justify-center text-xs text-muted-foreground/70">{children}</div>
	);
}
