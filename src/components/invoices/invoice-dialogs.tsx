'use client';

import { Plus, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoundingOptions } from '@/lib/util/Invoices';
import { cn } from '@/lib/utils';

import type { ClientResponse } from '@/server/invoice/invoice.service';

async function send(url: string, method: string, body: unknown) {
	const response = await fetch(url, {
		method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const json = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(json.error ?? 'Request failed');
	return json;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-1.5">
			<Label className="text-xs">{label}</Label>
			{children}
		</div>
	);
}

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
			await send(
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
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
							className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</Field>
					<Field label={`Projects billed to this client · ${draft.projects.length} selected`}>
						<div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
							{[...new Set([...draft.projects, ...projects])].map((project) => {
								const on = draft.projects.includes(project);
								return (
									<button
										key={project}
										type="button"
										aria-pressed={on}
										onClick={() =>
											setDraft({
												...draft,
												projects: on ? draft.projects.filter((p) => p !== project) : [...draft.projects, project],
											})
										}
										className={cn(
											'rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground',
											on && 'border-ember/60 bg-ember/15 text-ember',
										)}
									>
										{project}
									</button>
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
			const json = await send('/api/v1/users/current/invoices', 'POST', {
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
				<Button size="sm" disabled={!clients.length}>
					<Plus /> New invoice
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
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
			await send(`/api/v1/users/current/invoices/${id}`, 'PATCH', { status: next });
			router.refresh();
		} catch (error) {
			toast.error((error as Error).message);
		}
	};
	return (
		<div className="flex flex-wrap items-center gap-2 print:hidden">
			<Select value={status} onValueChange={setStatus}>
				<SelectTrigger size="sm" className="w-28">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{['draft', 'sent', 'paid'].map((option) => (
						<SelectItem key={option} value={option} className="capitalize">
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button size="sm" variant="outline" onClick={() => window.print()}>
				<Printer /> Print / PDF
			</Button>
		</div>
	);
}
