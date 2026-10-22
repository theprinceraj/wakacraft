import { BadRequestException, NotFoundException } from '@/lib/http/errors';
import { mongoClientService } from '@/lib/mongo/client/client.service';
import { mongoInvoiceService } from '@/lib/mongo/invoice/invoice.service';
import { eachDate } from '@/lib/util/Time';
import { loadDayTotals } from '@/server/stats/day-totals';
import { mergeStatTotals } from '@/server/stats/engine';
import { statsService } from '@/server/stats/stats.service';

import { buildLineItems, formatInvoiceNumber } from './invoice.calculator';

import type { ClientInput } from './invoice.request.dto';
import type { IClientZodSchema, IInvoiceZodSchema } from '@/lib/mongo/zod';

const toClientResponse = (client: IClientZodSchema) => ({
	id: client.id,
	name: client.name,
	email: client.email ?? null,
	address: client.address ?? null,
	hourly_rate: client.hourlyRate,
	currency: client.currency,
	rounding_minutes: client.roundingMinutes,
	projects: client.projects,
	created_at: client.createdAt.toISOString(),
});

export const toInvoiceResponse = (invoice: IInvoiceZodSchema) => ({
	id: invoice.id,
	number: formatInvoiceNumber(invoice.number),
	client: {
		id: invoice.clientId,
		name: invoice.clientName,
		email: invoice.clientEmail ?? null,
		address: invoice.clientAddress ?? null,
	},
	start: invoice.start,
	end: invoice.end,
	currency: invoice.currency,
	line_items: invoice.lineItems.map((item) => ({
		project: item.project,
		seconds: item.seconds,
		billed_seconds: item.billedSeconds,
		hourly_rate: item.hourlyRate,
		amount: item.amount,
	})),
	total: invoice.total,
	status: invoice.status,
	notes: invoice.notes ?? null,
	issued_at: invoice.issuedAt.toISOString(),
	due_at: invoice.dueAt?.toISOString() ?? null,
});

export type InvoiceResponse = ReturnType<typeof toInvoiceResponse>;
export type ClientResponse = ReturnType<typeof toClientResponse>;

const MAX_CLIENTS = 100;

class InvoiceService {
	// --- clients --------------------------------------------------------------------------------------------------

	public async listClients(userId: string) {
		return { data: (await mongoClientService.find({ userId }, '', { sort: { name: 1 } })).map(toClientResponse) };
	}

	public async createClient(userId: string, input: ClientInput) {
		if ((await mongoClientService.count({ userId })) >= MAX_CLIENTS) throw new BadRequestException('Too many clients');
		const client = await mongoClientService.create({
			...input,
			userId,
			email: input.email ?? undefined,
			address: input.address ?? undefined,
		});
		return { data: toClientResponse(client) };
	}

	public async updateClient(userId: string, id: string, input: Partial<ClientInput>) {
		const client = await mongoClientService.updateOne({ userId, id }, { $set: input });
		if (!client) throw new NotFoundException('Client not found');
		return { data: toClientResponse(client) };
	}

	public async deleteClient(userId: string, id: string) {
		if (!(await mongoClientService.deleteOne({ userId, id }, 'id'))) throw new NotFoundException('Client not found');
	}

	// --- invoices -------------------------------------------------------------------------------------------------

	/** Prices the client's projects over the range and freezes the result into a numbered invoice. */
	public async createInvoice(
		userId: string,
		input: { clientId: string; start: string; end: string; notes?: string | null; dueAt?: string | null },
	) {
		const client = await mongoClientService.findOne({ userId, id: input.clientId });
		if (!client) throw new NotFoundException('Client not found');
		if (!client.projects.length) throw new BadRequestException('Assign at least one project to this client first');

		const settings = await statsService.resolveSettings(userId);
		const dates = eachDate(input.start, input.end);
		const totals = await loadDayTotals(userId, dates, settings, { projects: client.projects });
		const projects = mergeStatTotals(dates.map((date) => totals.get(date)!.projects));
		const { lineItems, total } = buildLineItems(
			projects.map((project) => ({ name: project.name, seconds: project.totalSeconds })),
			client,
		);

		const [last] = await mongoInvoiceService.find({ userId }, ['number'], { sort: { number: -1 }, limit: 1 });
		const invoice = await mongoInvoiceService.create({
			userId,
			clientId: client.id,
			clientName: client.name,
			clientEmail: client.email,
			clientAddress: client.address,
			number: (last?.number ?? 0) + 1,
			start: input.start,
			end: input.end,
			currency: client.currency,
			lineItems,
			total,
			status: 'draft',
			notes: input.notes ?? undefined,
			issuedAt: new Date(),
			dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
		});
		return { data: toInvoiceResponse(invoice) };
	}

	public async listInvoices(userId: string) {
		return { data: (await mongoInvoiceService.find({ userId }, '', { sort: { number: -1 } })).map(toInvoiceResponse) };
	}

	public async getInvoice(userId: string, id: string) {
		const invoice = await mongoInvoiceService.findOne({ userId, id });
		if (!invoice) throw new NotFoundException('Invoice not found');
		return { data: toInvoiceResponse(invoice) };
	}

	public async updateInvoice(
		userId: string,
		id: string,
		input: { status?: IInvoiceZodSchema['status']; notes?: string | null },
	) {
		const { notes, ...rest } = input;
		const invoice = await mongoInvoiceService.updateOne(
			{ userId, id },
			{ $set: { ...rest, ...(notes ? { notes } : {}) }, ...(notes === null ? { $unset: { notes: 1 } } : {}) },
		);
		if (!invoice) throw new NotFoundException('Invoice not found');
		return { data: toInvoiceResponse(invoice) };
	}

	public async deleteInvoice(userId: string, id: string) {
		if (!(await mongoInvoiceService.deleteOne({ userId, id }, 'id'))) throw new NotFoundException('Invoice not found');
	}
}

export const invoiceService = new InvoiceService();
