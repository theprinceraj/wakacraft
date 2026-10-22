import { Pencil, Receipt } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { Panel } from '@/components/dashboard/panel';
import { ClientDialog, NewInvoiceDialog } from '@/components/invoices/invoice-dialogs';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { todayIn } from '@/lib/util/Time';
import { invoiceService } from '@/server/invoice/invoice.service';
import { projectService } from '@/server/project/project.service';
import { statsService } from '@/server/stats/stats.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Invoices' };

const money = (amount: number, currency: string) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function InvoicesPage() {
	return (
		<Suspense fallback={<div className="h-96 animate-pulse rounded-lg border bg-card/50" />}>
			<Invoices />
		</Suspense>
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

	return (
		<div className="grid gap-4 lg:grid-cols-12">
			<div className="flex flex-col gap-3 lg:col-span-8">
				<div className="flex items-end justify-between">
					<div>
						<h1 className="text-lg font-semibold tracking-tight">Invoices</h1>
						<p className="text-xs text-muted-foreground">Bill tracked time to clients at their hourly rate.</p>
					</div>
					<NewInvoiceDialog clients={clients.data} defaultStart={`${today.slice(0, 7)}-01`} defaultEnd={today} />
				</div>
				<Panel label={`${invoices.data.length} invoices`} bodyClassName="p-0">
					{invoices.data.length ? (
						<ul className="divide-y">
							{invoices.data.map((invoice) => (
								<li key={invoice.id}>
									<Link
										href={`/invoices/${invoice.id}`}
										className="grid grid-cols-[5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-accent/40"
									>
										<span className="tabular text-xs text-muted-foreground">{invoice.number}</span>
										<span className="truncate">{invoice.client.name}</span>
										<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
											{invoice.status}
										</span>
										<span className="tabular">{money(invoice.total, invoice.currency)}</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-xs text-muted-foreground">
							<Receipt className="size-5 text-ember" aria-hidden />
							{clients.data.length
								? 'No invoices yet — create one from tracked time.'
								: 'Add a client to start invoicing.'}
						</div>
					)}
				</Panel>
			</div>

			<div className="flex flex-col gap-3 lg:col-span-4">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-medium">Clients</h2>
					<ClientDialog
						projects={projectNames}
						trigger={
							<Button size="sm" variant="outline">
								Add client
							</Button>
						}
					/>
				</div>
				{clients.data.length ? (
					<ul className="flex flex-col gap-2">
						{clients.data.map((client) => (
							<li key={client.id} className="flex items-center gap-3 rounded-lg border bg-card/80 px-3.5 py-3">
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm">{client.name}</p>
									<p className="tabular text-[11px] text-muted-foreground">
										{money(client.hourly_rate, client.currency)}/h · {client.projects.length} project
										{client.projects.length === 1 ? '' : 's'}
									</p>
								</div>
								<ClientDialog
									projects={projectNames}
									client={client}
									trigger={
										<Button size="icon" variant="ghost" className="size-7" aria-label={`Edit ${client.name}`}>
											<Pencil />
										</Button>
									}
								/>
							</li>
						))}
					</ul>
				) : (
					<p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
						No clients yet.
					</p>
				)}
			</div>
		</div>
	);
}
