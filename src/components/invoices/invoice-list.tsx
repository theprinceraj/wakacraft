'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Segmented } from '@/components/app/segmented';
import { InvoiceStatusTag } from '@/components/invoices/invoice-status-tag';
import { formatDay, formatMoney } from '@/lib/format';
import { InvoiceStatuses, type InvoiceStatus } from '@/lib/util/Invoices';

const FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: InvoiceStatuses.Draft, label: 'Draft' },
	{ value: InvoiceStatuses.Sent, label: 'Sent' },
	{ value: InvoiceStatuses.Paid, label: 'Paid' },
];

export interface InvoiceRow {
	id: string;
	number: string;
	clientName: string;
	status: InvoiceStatus;
	total: number;
	currency: string;
	start: string;
	end: string;
}

/** The invoices, narrowed by status. */
export function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
	const [filter, setFilter] = useState('all');
	const shown = invoices.filter((invoice) => filter === 'all' || invoice.status === filter);

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<Segmented
				aria-label="Filter by status"
				value={filter}
				onValueChange={setFilter}
				options={FILTERS}
				className="self-start"
			/>
			<section className="tile overflow-hidden" aria-label="Invoices">
				{shown.length ? (
					<ul className="divide-y">
						{shown.map((invoice) => (
							<li key={invoice.id}>
								<Link
									href={`/invoices/${invoice.id}`}
									className="group/row flex items-center gap-3.5 px-5.5 py-3.5 transition-colors hover:bg-accent sm:px-7"
								>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium">{invoice.clientName}</span>
										<span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
											{invoice.number} · {formatDay(invoice.start.slice(0, 10))} – {formatDay(invoice.end.slice(0, 10))}
										</span>
									</span>
									<InvoiceStatusTag status={invoice.status} />
									<span className="min-w-21 text-right font-semibold tabular-nums">
										{formatMoney(invoice.total, invoice.currency)}
									</span>
									<ArrowUpRight
										className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5 max-sm:hidden"
										aria-hidden
									/>
								</Link>
							</li>
						))}
					</ul>
				) : (
					<p className="px-5 py-10 text-center text-sm text-muted-foreground">No invoices with this status.</p>
				)}
			</section>
		</div>
	);
}
