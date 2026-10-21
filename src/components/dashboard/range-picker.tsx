'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

const DASHBOARD_OPTIONS = [
	{ value: 'today', label: '1D' },
	{ value: '7d', label: '7D' },
	{ value: '14d', label: '14D' },
	{ value: '30d', label: '30D' },
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
];

/** Segmented range switch that writes `?range=` and re-renders the server page. */
export function RangePicker({
	value,
	options = DASHBOARD_OPTIONS,
}: {
	value: string;
	options?: readonly { value: string; label: string }[];
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [pending, startTransition] = useTransition();

	return (
		<ToggleGroup
			type="single"
			value={value}
			onValueChange={(next) => {
				if (!next) return;
				const params = new URLSearchParams(searchParams);
				params.set('range', next);
				startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
			}}
			className={cn('rounded-md border bg-card/60 p-0.5 transition-opacity', pending && 'opacity-60')}
			aria-label="Date range"
		>
			{options.map((option) => (
				<ToggleGroupItem
					key={option.value}
					value={option.value}
					className="tabular h-7 rounded-[5px] px-2.5 text-[11px] text-muted-foreground data-[state=on]:bg-ember/15 data-[state=on]:text-ember"
				>
					{option.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
