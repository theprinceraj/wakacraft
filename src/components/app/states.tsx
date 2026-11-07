import { cn } from '@/lib/utils';

import type { ComponentType, ReactNode } from 'react';

/** Full-width "nothing here yet" card: says what will appear and offers the next step. */
export function EmptyState({
	icon: Icon,
	title,
	children,
	action,
	className,
}: {
	icon: ComponentType<{ className?: string }>;
	title: ReactNode;
	children?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn('tile flex flex-col items-center gap-2 px-6 py-14 text-center', className)}>
			<span className="mb-2 grid size-13 place-items-center rounded-full bg-ember/12 text-ember-text">
				<Icon className="size-5.5" />
			</span>
			<h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
			{children ? <p className="max-w-[44ch] text-muted-foreground">{children}</p> : null}
			{action ? <div className="mt-3">{action}</div> : null}
		</div>
	);
}

/** Loading placeholder shaped like a typical page: a heading, stats, then panels. */
export function PageSkeleton({ stats = true, rows = 2 }: { stats?: boolean; rows?: number }) {
	return (
		<div className="flex animate-pulse flex-col gap-4 motion-reduce:animate-none" aria-busy aria-label="Loading">
			<div className="mb-2 h-12 w-64 max-w-[70%] rounded-xl bg-card" />
			{stats ? (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{Array.from({ length: 4 }, (_, index) => (
						<div key={index} className="h-28 rounded-3xl bg-card" />
					))}
				</div>
			) : null}
			{Array.from({ length: rows }, (_, index) => (
				<div key={index} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<div className="tile h-72 lg:col-span-8" />
					<div className="tile h-72 lg:col-span-4" />
				</div>
			))}
		</div>
	);
}
