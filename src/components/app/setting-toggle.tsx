'use client';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

/** A labelled switch on its own row. Disabled rows say so visually and can't be toggled. */
export function SettingToggle({
	title,
	hint,
	checked,
	onCheckedChange,
	disabled = false,
	className,
}: {
	title: ReactNode;
	hint?: ReactNode;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<label
			className={cn(
				'flex items-start justify-between gap-4 rounded-2xl bg-background px-4 py-3.5',
				disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
				className,
			)}
		>
			<span>
				<span className="block text-sm font-medium">{title}</span>
				{hint ? <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{hint}</span> : null}
			</span>
			<Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
		</label>
	);
}
