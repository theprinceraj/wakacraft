import { z } from 'zod';

import { ClientZodSchema, InvoiceZodSchema } from '@/lib/mongo/zod';
import { RoundingOptions } from '@/lib/util/Invoices';

const ClientFieldsSchema = ClientZodSchema.pick({ name: true }).extend({
	name: z.string().trim().min(1).max(120),
	email: z.email().max(254).nullish(),
	address: z.string().trim().max(500).nullish(),
	hourlyRate: z.number().min(0).max(100_000),
	currency: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code like USD'),
	roundingMinutes: z.union(RoundingOptions.map((option) => z.literal(option))).default(0),
	projects: z.array(z.string().trim().min(1).max(512)).max(200).default([]),
});

export const CreateClientSchema = ClientFieldsSchema.strict();
export const UpdateClientSchema = ClientFieldsSchema.partial().strict();
export type ClientInput = z.output<typeof CreateClientSchema>;

export const CreateInvoiceSchema = z
	.object({
		clientId: ClientZodSchema.shape.id,
		start: z.iso.date(),
		end: z.iso.date(),
		notes: z.string().trim().max(2000).nullish(),
		dueAt: z.iso.date().nullish(),
	})
	.strict()
	.refine((invoice) => invoice.start <= invoice.end, { message: 'start must not be after end', path: ['end'] })
	.refine((invoice) => (Date.parse(invoice.end) - Date.parse(invoice.start)) / 86_400_000 <= 400, {
		message: 'An invoice can cover at most 400 days',
		path: ['end'],
	});

export const UpdateInvoiceSchema = InvoiceZodSchema.pick({ status: true })
	.partial()
	.extend({ notes: z.string().trim().max(2000).nullish() })
	.strict();

export const ClientParamsSchema = z.object({ user: z.string(), id: ClientZodSchema.shape.id });
export const InvoiceParamsSchema = z.object({ user: z.string(), id: InvoiceZodSchema.shape.id });
