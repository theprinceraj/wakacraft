import { Schema, SchemaTypes } from 'mongoose';

import { createSubSchema } from '../../util/Constants';
import { InvoiceStatusesList } from '../../util/Invoices';
import { generateFlake } from '../../util/Snowflake';

import type { IInvoiceZodSchema } from '../zod';

export const InvoiceSchemaName = 'Invoice';

const lineItemSchema = createSubSchema({
	project: { type: SchemaTypes.String, required: true },
	/** Tracked seconds before rounding. */
	seconds: { type: SchemaTypes.Number, required: true },
	billedSeconds: { type: SchemaTypes.Number, required: true },
	hourlyRate: { type: SchemaTypes.Number, required: true },
	amount: { type: SchemaTypes.Number, required: true },
});

/**
 * An invoice for one client and date range. Line items are computed once and frozen, so later activity or rate
 * changes never alter an issued invoice.
 */
export const InvoiceSchema = new Schema<IInvoiceZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		clientId: { type: SchemaTypes.String, required: true },
		clientName: { type: SchemaTypes.String, required: true },
		clientEmail: { type: SchemaTypes.String, required: false },
		clientAddress: { type: SchemaTypes.String, required: false },
		/** Per-user sequence, rendered as INV-0001. */
		number: { type: SchemaTypes.Number, required: true },
		start: { type: SchemaTypes.String, required: true },
		end: { type: SchemaTypes.String, required: true },
		currency: { type: SchemaTypes.String, required: true },
		lineItems: { type: [lineItemSchema], required: true },
		total: { type: SchemaTypes.Number, required: true },
		status: { type: SchemaTypes.String, enum: InvoiceStatusesList, required: true, default: 'draft' },
		notes: { type: SchemaTypes.String, required: false, maxLength: 2000 },
		issuedAt: { type: SchemaTypes.Date, required: true },
		dueAt: { type: SchemaTypes.Date, required: false },
	},
	{ timestamps: true, versionKey: false },
);

InvoiceSchema.index({ userId: 1, number: -1 }, { unique: true });
