import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { PageSkeleton } from '@/components/app/states';
import { InvoiceActions } from '@/components/invoices/invoice-dialogs';
import { InvoiceStatusTag } from '@/components/invoices/invoice-status-tag';
import { requireSession } from '@/lib/auth/session';
import { formatDay, formatDuration, formatMoney } from '@/lib/format';
import { NotFoundException } from '@/lib/http/errors';
import { invoiceService } from '@/server/invoice/invoice.service';

const longDate = (date: string) => formatDay(date.slice(0, 10), { month: 'long', day: 'numeric', year: 'numeric' });

export default function InvoicePage({ params }: PageProps<'/invoices/[id]'>) {
	return (
		<Suspense fallback={<PageSkeleton stats={false} rows={1} />}>
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
		<div className="mx-auto max-w-[52rem]">
			<div className="print:hidden">
				<Link
					href="/invoices"
					className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-3.5" aria-hidden /> Invoices
				</Link>
				<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
							{invoice.number}
							<span className="text-ember">.</span>
						</h1>
						<InvoiceStatusTag status={invoice.status} />
					</div>
					<InvoiceActions id={invoice.id} status={invoice.status} />
				</div>
			</div>

			{/* Printed as-is: plain light document styling in every theme, so the PDF looks like an invoice, not a dashboard. */}
			<article className="rounded-[28px] bg-white p-7 text-zinc-900 ring-1 ring-border sm:p-12 print:rounded-none print:p-0 print:ring-0">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-[26px] font-semibold tracking-[-0.03em]">Invoice</p>
						<p className="mt-1 font-mono text-[13px] text-zinc-500">{invoice.number}</p>
					</div>
					<div className="text-right text-[13px]">
						<p className="font-medium">{session.user.name}</p>
						<p className="text-zinc-500">{session.user.email}</p>
					</div>
				</header>

				<section className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
					<div>
						<p className="text-xs text-zinc-500">Billed to</p>
						<p className="mt-1 font-medium">{invoice.client.name}</p>
						{invoice.client.email ? <p className="text-zinc-600">{invoice.client.email}</p> : null}
						{invoice.client.address ? (
							<p className="whitespace-pre-line text-zinc-600">{invoice.client.address}</p>
						) : null}
					</div>
					<div className="sm:text-right">
						<p className="text-xs text-zinc-500">Period</p>
						<p className="mt-1">
							{longDate(invoice.start)} – {longDate(invoice.end)}
						</p>
						<p className="mt-2.5 text-xs text-zinc-500">Issued</p>
						<p>{longDate(invoice.issued_at)}</p>
						{invoice.due_at ? (
							<>
								<p className="mt-2.5 text-xs text-zinc-500">Due</p>
								<p>{longDate(invoice.due_at)}</p>
							</>
						) : null}
					</div>
				</section>

				<div className="mt-8">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
								<th className="py-2 font-medium">Project</th>
								<th className="py-2 pl-3 text-right font-medium">Time</th>
								<th className="hidden py-2 pl-3 text-right font-medium sm:table-cell print:table-cell">Rate</th>
								<th className="py-2 pl-3 text-right font-medium">Amount</th>
							</tr>
						</thead>
						<tbody className="tabular-nums">
							{invoice.line_items.map((item) => (
								<tr key={item.project} className="border-b border-zinc-100">
									<td className="py-3 [overflow-wrap:anywhere]">
										{item.project}
										{/* Too narrow for a rate column on phones, so it moves under the project. */}
										<span className="block text-[11px] text-zinc-500 sm:hidden print:hidden">
											{formatMoney(item.hourly_rate, invoice.currency)}/h
										</span>
									</td>
									<td className="py-3 pl-3 text-right whitespace-nowrap">
										{formatDuration(item.billed_seconds)}
										{item.billed_seconds !== item.seconds ? (
											<span className="block text-[11px] text-zinc-500">tracked {formatDuration(item.seconds)}</span>
										) : null}
									</td>
									<td className="hidden py-3 pl-3 text-right whitespace-nowrap sm:table-cell print:table-cell">
										{formatMoney(item.hourly_rate, invoice.currency)}/h
									</td>
									<td className="py-3 pl-3 text-right whitespace-nowrap">
										{formatMoney(item.amount, invoice.currency)}
									</td>
								</tr>
							))}
							{!invoice.line_items.length ? (
								<tr>
									<td colSpan={4} className="py-6 text-center text-zinc-500">
										No billable time in this period.
									</td>
								</tr>
							) : null}
						</tbody>
						<tfoot>
							<tr>
								<td colSpan={4} className="pt-4.5">
									<div className="flex items-baseline justify-end gap-4">
										<span className="font-medium">Total</span>
										<span className="text-xl font-semibold tabular-nums">
											{formatMoney(invoice.total, invoice.currency)}
										</span>
									</div>
								</td>
							</tr>
						</tfoot>
					</table>
				</div>

				{invoice.notes ? <p className="mt-8 text-[13px] whitespace-pre-line text-zinc-600">{invoice.notes}</p> : null}
			</article>
		</div>
	);
}
