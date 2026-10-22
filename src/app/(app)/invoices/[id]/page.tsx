import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { InvoiceActions } from '@/components/invoices/invoice-dialogs';
import { requireSession } from '@/lib/auth/session';
import { formatDay, formatDuration } from '@/lib/format';
import { NotFoundException } from '@/lib/http/errors';
import { invoiceService } from '@/server/invoice/invoice.service';

const money = (amount: number, currency: string) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
const longDate = (date: string) => formatDay(date.slice(0, 10), { month: 'long', day: 'numeric', year: 'numeric' });

export default function InvoicePage({ params }: PageProps<'/invoices/[id]'>) {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Invoice params={params} />
		</Suspense>
	);
}

async function Invoice({ params }: Pick<PageProps<'/invoices/[id]'>, 'params'>) {
	const session = await requireSession('/invoices');
	const { id } = await params;
	const { data: invoice } = await invoiceService.getInvoice(session.user.id, id).catch((error) => {
		if (error instanceof NotFoundException) notFound();
		throw error;
	});

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
				<Link
					href="/invoices"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="size-3" /> Invoices
				</Link>
				<InvoiceActions id={invoice.id} status={invoice.status} />
			</div>

			{/* Printed as-is: plain light document styling so the PDF looks like an invoice, not a dashboard. */}
			<article className="rounded-lg bg-white p-10 text-zinc-900 shadow-xl print:rounded-none print:p-0 print:shadow-none">
				<header className="flex items-start justify-between gap-6">
					<div>
						<p className="text-2xl font-semibold tracking-tight">Invoice</p>
						<p className="tabular mt-1 text-sm text-zinc-500">{invoice.number}</p>
					</div>
					<div className="text-right text-sm">
						<p className="font-medium">{session.user.name}</p>
						<p className="text-zinc-500">{session.user.email}</p>
					</div>
				</header>

				<section className="mt-8 grid grid-cols-2 gap-6 text-sm">
					<div>
						<p className="text-xs tracking-wide text-zinc-500 uppercase">Billed to</p>
						<p className="mt-1 font-medium">{invoice.client.name}</p>
						{invoice.client.email ? <p className="text-zinc-600">{invoice.client.email}</p> : null}
						{invoice.client.address ? (
							<p className="whitespace-pre-line text-zinc-600">{invoice.client.address}</p>
						) : null}
					</div>
					<div className="text-right">
						<p className="text-xs tracking-wide text-zinc-500 uppercase">Period</p>
						<p className="mt-1">
							{longDate(invoice.start)} – {longDate(invoice.end)}
						</p>
						<p className="mt-2 text-xs tracking-wide text-zinc-500 uppercase">Issued</p>
						<p>{longDate(invoice.issued_at)}</p>
						{invoice.due_at ? (
							<>
								<p className="mt-2 text-xs tracking-wide text-zinc-500 uppercase">Due</p>
								<p>{longDate(invoice.due_at)}</p>
							</>
						) : null}
					</div>
				</section>

				<table className="mt-8 w-full text-sm">
					<thead>
						<tr className="border-b border-zinc-200 text-left text-xs tracking-wide text-zinc-500 uppercase">
							<th className="py-2 font-medium">Project</th>
							<th className="py-2 text-right font-medium">Time</th>
							<th className="py-2 text-right font-medium">Rate</th>
							<th className="py-2 text-right font-medium">Amount</th>
						</tr>
					</thead>
					<tbody>
						{invoice.line_items.map((item) => (
							<tr key={item.project} className="border-b border-zinc-100">
								<td className="py-2.5">{item.project}</td>
								<td className="tabular py-2.5 text-right">
									{formatDuration(item.billed_seconds)}
									{item.billed_seconds !== item.seconds ? (
										<span className="block text-[11px] text-zinc-400">tracked {formatDuration(item.seconds)}</span>
									) : null}
								</td>
								<td className="tabular py-2.5 text-right">{money(item.hourly_rate, invoice.currency)}/h</td>
								<td className="tabular py-2.5 text-right">{money(item.amount, invoice.currency)}</td>
							</tr>
						))}
						{!invoice.line_items.length ? (
							<tr>
								<td colSpan={4} className="py-6 text-center text-zinc-400">
									No billable time in this period.
								</td>
							</tr>
						) : null}
					</tbody>
					<tfoot>
						<tr>
							<td colSpan={3} className="pt-4 text-right font-medium">
								Total
							</td>
							<td className="tabular pt-4 text-right text-lg font-semibold">
								{money(invoice.total, invoice.currency)}
							</td>
						</tr>
					</tfoot>
				</table>

				{invoice.notes ? <p className="mt-8 text-sm whitespace-pre-line text-zinc-600">{invoice.notes}</p> : null}
			</article>
		</div>
	);
}
