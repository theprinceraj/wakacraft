/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const InvoiceZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	clientId: z.string(),
	clientName: z.string(),
	clientEmail: z.string().nullish(),
	clientAddress: z.string().nullish(),
	number: z.number(),
	start: z.string(),
	end: z.string(),
	currency: z.string(),
	lineItems: z.array(
		z.object({
			project: z.string(),
			seconds: z.number(),
			billedSeconds: z.number(),
			hourlyRate: z.number(),
			amount: z.number(),
		}),
	),
	total: z.number(),
	status: z.enum(['draft', 'sent', 'paid']).default('draft'),
	notes: z.string().max(2000).nullish(),
	issuedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	dueAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' })
		.nullish(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialInvoiceZodSchema = InvoiceZodSchema.partial();

export type IInvoiceZodSchema = TypeOf<typeof InvoiceZodSchema>;
export type IInvoiceZodSchemaInput = Omit<z.input<typeof InvoiceZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof InvoiceZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialInvoiceZodSchema = TypeOf<typeof PartialInvoiceZodSchema>;
