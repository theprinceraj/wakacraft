import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export function StatTile({
	label,
	value,
	hint,
	accent = false,
	className,
}: {
	label: ReactNode;
	value: ReactNode;
	hint?: ReactNode;
	accent?: boolean;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex min-w-0 flex-col rounded-3xl px-5 py-4.5',
				accent ? 'tile-ember' : 'bg-card text-card-foreground',
				className,
			)}
		>
			<span className="text-[13px] text-muted-foreground">{label}</span>
			<div
				title={typeof value === 'string' ? value : undefined}
				className="mt-2.5 truncate text-[clamp(1.375rem,2.6vw,1.875rem)] leading-[1.15] font-semibold tracking-[-0.03em]"
			>
				{value}
			</div>
			{hint ? <div className="mt-1.5 truncate text-[12.5px] text-muted-foreground">{hint}</div> : null}
		</div>
	);
}

/** Two columns on phones, four from tablets up. */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('grid grid-cols-2 gap-4 md:grid-cols-4', className)}>{children}</div>;
}
