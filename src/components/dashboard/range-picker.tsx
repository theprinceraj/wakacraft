'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { Segmented } from '@/components/app/segmented';
import { cn } from '@/lib/utils';

const DASHBOARD_OPTIONS = [
	{ value: 'today', label: 'Today' },
	{ value: '7d', label: '7 days' },
	{ value: '14d', label: '14 days' },
	{ value: '30d', label: '30 days' },
	{ value: 'week', label: 'This week' },
	{ value: 'month', label: 'This month' },
];

/** Segmented range switch that writes `?range=` and re-renders the server page, keeping the old view until it's ready. */
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
		<Segmented
			aria-label="Date range"
			value={value}
			options={options}
			className={cn('transition-opacity', pending && 'opacity-60')}
			onValueChange={(next) => {
				const params = new URLSearchParams(searchParams);
				params.set('range', next);
				startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
			}}
		/>
	);
}
