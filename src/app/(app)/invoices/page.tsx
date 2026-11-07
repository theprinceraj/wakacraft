import { Pencil, Plus } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { PageSkeleton } from '@/components/app/states';
import { StatTile } from '@/components/dashboard/stat-tile';
import { ClientDialog, NewInvoiceDialog } from '@/components/invoices/invoice-dialogs';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { formatMoney } from '@/lib/format';
import { InvoiceStatuses, type InvoiceStatus } from '@/lib/util/Invoices';
import { todayIn } from '@/lib/util/Time';
import { invoiceService } from '@/server/invoice/invoice.service';
import { projectService } from '@/server/project/project.service';
import { statsService } from '@/server/stats/stats.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Invoices' };

export default function InvoicesPage() {
	return (
		<Suspense fallback={<PageSkeleton rows={1} />}>
			<Invoices />
		</Suspense>
	);
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** Clients can bill in different currencies, and those can't be added together. */
function sumByCurrency(invoices: { total: number; currency: string }[]) {
	const totals = new Map<string, number>();
	for (const invoice of invoices) totals.set(invoice.currency, (totals.get(invoice.currency) ?? 0) + invoice.total);
	if (!totals.size) return '—';
	return (
		<span className="whitespace-normal">
			{[...totals].map(([currency, total]) => formatMoney(total, currency)).join(' + ')}
		</span>
	);
}

async function Invoices() {
	const session = await requireSession('/invoices');
	const [clients, invoices, projects, settings] = await Promise.all([
		invoiceService.listClients(session.user.id),
		invoiceService.listInvoices(session.user.id),
		projectService.list(session.user.id),
		statsService.resolveSettings(session.user.id),
	]);
	const today = todayIn(settings.timezone);
	const projectNames = projects.map((project) => project.name);
	const withStatus = (status: InvoiceStatus) => invoices.data.filter((invoice) => invoice.status === status);
	const sent = withStatus(InvoiceStatuses.Sent);
	const paid = withStatus(InvoiceStatuses.Paid);
	const drafts = withStatus(InvoiceStatuses.Draft);

	const newInvoice = (
		<NewInvoiceDialog clients={clients.data} defaultStart={`${today.slice(0, 7)}-01`} defaultEnd={today} />
	);
	const addClient = (
		<ClientDialog
			projects={projectNames}
			trigger={
				<Button size="sm" variant="outline">
					<Plus /> Add client
				</Button>
			}
		/>
	);

	const clientList = (
		<aside className="flex min-w-0 flex-col gap-3 lg:col-span-4">
			<div className="flex min-h-10 items-center justify-between gap-3">
				<h2 className="text-lg font-semibold tracking-[-0.025em]">Clients</h2>
				{addClient}
			</div>
			{clients.data.length ? (
				<ul className="flex flex-col gap-2.5">
					{clients.data.map((client) => (
						<li key={client.id} className="tile flex items-center gap-3 py-4 pr-3.5 pl-5.5">
							<div className="min-w-0 flex-1">
								<p className="truncate font-semibold">{client.name}</p>
								<p className="truncate text-xs text-muted-foreground tabular-nums">
									{formatMoney(client.hourly_rate, client.currency)}/h · {plural(client.projects.length, 'project')}
								</p>
							</div>
							<ClientDialog
								projects={projectNames}
								client={client}
								trigger={
									<Button
										size="icon"
										variant="ghost"
										className="text-muted-foreground"
										aria-label={`Edit ${client.name}`}
									>
										<Pencil />
									</Button>
								}
							/>
						</li>
					))}
				</ul>
			) : (
				<p className="tile px-5 py-8 text-center text-[13px] text-muted-foreground">No clients yet.</p>
			)}
		</aside>
	);

	return (
		<>
			<PageHeader
				title="Invoices"
				description="Bill tracked time to clients at their hourly rate."
				actions={clients.data.length ? newInvoice : undefined}
			/>

			{invoices.data.length ? (
				<div className="flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
						<StatTile
							label="Outstanding"
							value={sumByCurrency(sent)}
							hint={`${plural(sent.length, 'invoice')} sent, not yet paid`}
						/>
						<StatTile label="Paid" value={sumByCurrency(paid)} hint={plural(paid.length, 'invoice')} />
						<StatTile
							label="Drafts"
							value={sumByCurrency(drafts)}
							hint={`${plural(drafts.length, 'invoice')} not sent yet`}
							className="max-md:col-span-2"
						/>
					</div>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
						<div className="min-w-0 lg:col-span-8">
							<InvoiceList
								invoices={invoices.data.map((invoice) => ({
									id: invoice.id,
									number: invoice.number,
									clientName: invoice.client.name,
									status: invoice.status,
									total: invoice.total,
									currency: invoice.currency,
									start: invoice.start,
									end: invoice.end,
								}))}
							/>
						</div>
						{clientList}
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					<ol className="grid gap-4 md:grid-cols-3">
						<li className={`tile flex flex-col gap-10 p-5.5 sm:p-7 ${clients.data.length ? '' : 'tile-ink'}`}>
							<p className="font-mono text-[13px] text-muted-foreground">01</p>
							<div>
								<h2 className="text-lg font-semibold tracking-[-0.025em]">Add a client</h2>
								<p className="mt-1 text-[13px] text-muted-foreground">
									Set an hourly rate and choose which projects you bill to them.
								</p>
							</div>
						</li>
						<li className={`tile flex flex-col gap-10 p-5.5 sm:p-7 ${clients.data.length ? 'tile-ink' : ''}`}>
							<p className="font-mono text-[13px] text-muted-foreground">02</p>
							<div>
								<h2 className="text-lg font-semibold tracking-[-0.025em]">Create an invoice</h2>
								<p className="mt-1 text-[13px] text-muted-foreground">
									Pick a client and a period. wakacraft works out the time and the amount.
								</p>
							</div>
						</li>
						<li className="tile flex flex-col gap-10 p-5.5 sm:p-7">
							<p className="font-mono text-[13px] text-muted-foreground">03</p>
							<div>
								<h2 className="text-lg font-semibold tracking-[-0.025em]">Print or save as PDF</h2>
								<p className="mt-1 text-[13px] text-muted-foreground">
									A clean document your client can pay from, with no dashboard around it.
								</p>
							</div>
						</li>
					</ol>
					<div className="grid grid-cols-1 lg:grid-cols-12">{clientList}</div>
				</div>
			)}
		</>
	);
}
