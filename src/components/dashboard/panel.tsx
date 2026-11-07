import { cn } from '@/lib/utils';

import type { ComponentProps, ReactNode } from 'react';

const TONES = { card: '', ink: 'tile-ink' } as const;

/**
 * The building block of every signed-in page: the homepage's borderless card with a sentence-case title, an optional
 * description and right-side meta. `flush` removes the body padding for edge-to-edge lists.
 */
export function Panel({
	label,
	description,
	meta,
	children,
	className,
	bodyClassName,
	tone = 'card',
	flush = false,
	...props
}: Omit<ComponentProps<'section'>, 'children'> & {
	label: ReactNode;
	description?: ReactNode;
	meta?: ReactNode;
	children: ReactNode;
	bodyClassName?: string;
	tone?: keyof typeof TONES;
	flush?: boolean;
}) {
	return (
		<section
			className={cn('tile relative flex min-w-0 flex-col', TONES[tone], !flush && 'p-5.5 sm:p-7', className)}
			{...props}
		>
			<header
				className={cn(
					'flex min-w-0 items-start justify-between gap-3',
					flush ? 'px-5.5 pt-5.5 pb-3.5 sm:px-7 sm:pt-7' : 'mb-5',
				)}
			>
				<div className="min-w-0">
					<h2 className="text-lg leading-snug font-semibold tracking-[-0.025em]">{label}</h2>
					{description ? <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p> : null}
				</div>
				{meta ? (
					<div className="shrink-0 pt-0.5 text-[13px] whitespace-nowrap text-muted-foreground">{meta}</div>
				) : null}
			</header>
			<div className={cn('min-w-0 flex-1', flush && 'overflow-hidden rounded-b-[28px]', bodyClassName)}>{children}</div>
		</section>
	);
}

export function PanelEmpty({ children = 'No activity in this range' }: { children?: ReactNode }) {
	return (
		<div className="flex h-full min-h-24 items-center justify-center text-sm text-muted-foreground">{children}</div>
	);
}
