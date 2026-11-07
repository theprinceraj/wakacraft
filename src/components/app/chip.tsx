import { cn } from '@/lib/utils';

import type { ComponentProps, ReactNode } from 'react';

/** Selectable pill, for filters and multi-select fields. Exported as a class so that links can use it too. */
export const chipClass = (on: boolean) =>
	cn(
		'inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-[13px] whitespace-nowrap transition-colors',
		on
			? 'bg-ember/11 font-medium text-ember-text shadow-[inset_0_0_0_1.5px_var(--ember)]'
			: 'text-muted-foreground shadow-[inset_0_0_0_1px_var(--input)] hover:text-foreground',
	);

export function Chip({
	selected,
	className,
	...props
}: Omit<ComponentProps<'button'>, 'type' | 'aria-pressed'> & { selected: boolean }) {
	return <button type="button" aria-pressed={selected} className={cn(chipClass(selected), className)} {...props} />;
}

const TAG_TONES = {
	neutral: 'bg-accent text-muted-foreground',
	ember: 'bg-ember/12 text-ember-text',
	good: 'bg-success/14 text-success',
	bad: 'bg-destructive/11 text-destructive',
} as const;

/** Small status label. States always carry words, and an icon where it helps, never colour alone. */
export function Tag({
	tone = 'neutral',
	children,
	className,
}: {
	tone?: keyof typeof TAG_TONES;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				'inline-flex h-6 shrink-0 items-center gap-1.25 rounded-full px-2.25 text-xs font-medium whitespace-nowrap [&_svg]:size-3.25',
				TAG_TONES[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}
