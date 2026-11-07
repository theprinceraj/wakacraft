'use client';

import { useEffect, useRef } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

/**
 * Pill-shaped single choice. On narrow screens it scrolls sideways, keeping the selected option in view by moving only
 * its own overflow, never the page.
 */
export function Segmented({
	value,
	onValueChange,
	options,
	className,
	tone = 'card',
	'aria-label': ariaLabel,
}: {
	value: string;
	onValueChange: (value: string) => void;
	options: readonly { value: string; label: string }[];
	className?: string;
	/** `background` for use on top of a card. */
	tone?: 'card' | 'background';
	'aria-label': string;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const root = ref.current;
		const active = root?.querySelector<HTMLElement>('[data-state="on"]');
		if (root && active && root.scrollWidth > root.clientWidth)
			root.scrollLeft = active.offsetLeft - root.offsetLeft - 8;
	}, [value]);

	return (
		<ToggleGroup
			ref={ref}
			type="single"
			value={value}
			spacing={0.5}
			onValueChange={(next) => {
				if (next) onValueChange(next);
			}}
			aria-label={ariaLabel}
			className={cn(
				'scroll-x-quiet max-w-full rounded-full p-1',
				tone === 'card' ? 'bg-card' : 'bg-background',
				className,
			)}
		>
			{options.map((option) => (
				<ToggleGroupItem
					key={option.value}
					value={option.value}
					className="h-8 shrink-0 rounded-full px-3.25 text-[13px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:ring-inset aria-pressed:bg-seg-on aria-pressed:font-medium aria-pressed:text-seg-on-foreground data-[state=on]:bg-seg-on data-[state=on]:font-medium data-[state=on]:text-seg-on-foreground"
				>
					{option.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
