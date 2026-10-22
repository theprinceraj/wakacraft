import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { InvoiceSchema, InvoiceSchemaName } from '../schemas/invoice.schema';

import type { IInvoiceZodSchema, IInvoiceZodSchemaInput } from '../zod';

export class MongoInvoiceService extends MongoBaseService<IInvoiceZodSchemaInput, IInvoiceZodSchema> {
	public readonly model = registerModel<IInvoiceZodSchemaInput, IInvoiceZodSchema>(InvoiceSchemaName, InvoiceSchema);
}

export const mongoInvoiceService = new MongoInvoiceService();
