'use client';

import { Plus, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Chip } from '@/components/app/chip';
import { Field } from '@/components/app/field';
import { Segmented } from '@/components/app/segmented';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendJson } from '@/lib/http/send-json';
import { InvoiceStatusesList, RoundingOptions } from '@/lib/util/Invoices';

import type { ClientResponse } from '@/server/invoice/invoice.service';

export function ClientDialog({
	projects,
	client,
	trigger,
}: {
	projects: string[];
	client?: ClientResponse;
	trigger: ReactNode;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState({
		name: client?.name ?? '',
		email: client?.email ?? '',
		address: client?.address ?? '',
		hourlyRate: String(client?.hourly_rate ?? ''),
		currency: client?.currency ?? 'USD',
		roundingMinutes: client?.rounding_minutes ?? 0,
		projects: client?.projects ?? [],
	});

	async function save(event: React.FormEvent) {
		event.preventDefault();
		try {
			await sendJson(
				client ? `/api/v1/users/current/clients/${client.id}` : '/api/v1/users/current/clients',
				client ? 'PATCH' : 'POST',
				{
					name: draft.name,
					email: draft.email.trim() || null,
					address: draft.address.trim() || null,
					hourlyRate: Number(draft.hourlyRate),
					currency: draft.currency,
					roundingMinutes: draft.roundingMinutes,
					projects: draft.projects,
				},
			);
			setOpen(false);
			toast.success(client ? 'Client updated' : 'Client added');
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>{client ? 'Edit client' : 'New client'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={save} className="flex flex-col gap-4">
					<Field label="Name">
						<Input
							value={draft.name}
							onChange={(e) => setDraft({ ...draft, name: e.target.value })}
							required
							maxLength={120}
						/>
					</Field>
					<div className="grid grid-cols-3 gap-3">
						<Field label="Hourly rate">
							<Input
								type="number"
								min={0}
								step="0.01"
								value={draft.hourlyRate}
								onChange={(e) => setDraft({ ...draft, hourlyRate: e.target.value })}
								required
								className="tabular"
							/>
						</Field>
						<Field label="Currency">
							<Input
								value={draft.currency}
								maxLength={3}
								onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
								className="tabular"
							/>
						</Field>
						<Field label="Round up to">
							<Select
								value={String(draft.roundingMinutes)}
								onValueChange={(value) =>
									setDraft({ ...draft, roundingMinutes: Number(value) as typeof draft.roundingMinutes })
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{RoundingOptions.map((option) => (
										<SelectItem key={option} value={String(option)}>
											{option ? `${option} min` : 'Exact'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>
					<Field label="Email (optional)">
						<Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
					</Field>
					<Field label="Billing address (optional)">
						<textarea
							rows={2}
							value={draft.address}
							onChange={(e) => setDraft({ ...draft, address: e.target.value })}
							className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						/>
					</Field>
					<Field group label={`Projects billed to this client · ${draft.projects.length} selected`}>
						<div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto p-0.5">
							{[...new Set([...draft.projects, ...projects])].map((project) => {
								const on = draft.projects.includes(project);
								return (
									<Chip
										key={project}
										selected={on}
										onClick={() =>
											setDraft({
												...draft,
												projects: on ? draft.projects.filter((p) => p !== project) : [...draft.projects, project],
											})
										}
									>
										{project}
									</Chip>
								);
							})}
						</div>
					</Field>
					<DialogFooter>
						<Button type="submit">{client ? 'Save' : 'Add client'}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function NewInvoiceDialog({
	clients,
	defaultStart,
	defaultEnd,
}: {
	clients: ClientResponse[];
	defaultStart: string;
	defaultEnd: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState({
		clientId: clients[0]?.id ?? '',
		start: defaultStart,
		end: defaultEnd,
		notes: '',
	});
	const [pending, setPending] = useState(false);

	async function create(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		try {
			const json = await sendJson('/api/v1/users/current/invoices', 'POST', {
				...draft,
				notes: draft.notes.trim() || null,
			});
			setOpen(false);
			router.push(`/invoices/${json.data.id}`);
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size="lg"
					className="pl-4"
					disabled={!clients.length}
					title={clients.length ? undefined : 'Add a client first'}
				>
					<Plus /> New invoice
				</Button>
			</DialogTrigger>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>New invoice</DialogTitle>
				</DialogHeader>
				<form onSubmit={create} className="flex flex-col gap-4">
					<Field label="Client">
						<Select value={draft.clientId} onValueChange={(clientId) => setDraft({ ...draft, clientId })}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{clients.map((client) => (
									<SelectItem key={client.id} value={client.id}>
										{client.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<div className="grid grid-cols-2 gap-3">
						<Field label="From">
							<Input
								type="date"
								value={draft.start}
								onChange={(e) => setDraft({ ...draft, start: e.target.value })}
								required
							/>
						</Field>
						<Field label="To">
							<Input
								type="date"
								value={draft.end}
								onChange={(e) => setDraft({ ...draft, end: e.target.value })}
								required
							/>
						</Field>
					</div>
					<Field label="Notes (optional)">
						<Input
							value={draft.notes}
							onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
							maxLength={2000}
						/>
					</Field>
					<DialogFooter>
						<Button type="submit" disabled={pending}>
							{pending ? 'Calculating…' : 'Create invoice'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function InvoiceActions({ id, status }: { id: string; status: string }) {
	const router = useRouter();
	const setStatus = async (next: string) => {
		try {
			await sendJson(`/api/v1/users/current/invoices/${id}`, 'PATCH', { status: next });
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	};
	return (
		<div className="flex flex-wrap items-center gap-2 print:hidden">
			<Segmented
				aria-label="Invoice status"
				value={status}
				onValueChange={setStatus}
				options={InvoiceStatusesList.map((option) => ({
					value: option,
					label: option[0].toUpperCase() + option.slice(1),
				}))}
			/>
			<Button variant="outline" onClick={() => window.print()}>
				<Printer /> Print / PDF
			</Button>
		</div>
	);
}
