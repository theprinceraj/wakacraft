import { requireSelf, route } from '@/lib/http/route';
import { InvoiceParamsSchema, UpdateInvoiceSchema } from '@/server/invoice/invoice.request.dto';
import { invoiceService } from '@/server/invoice/invoice.service';

export const GET = route({ auth: 'required', params: InvoiceParamsSchema }, async ({ caller, params }) =>
	invoiceService.getInvoice(await requireSelf(params.user, caller), params.id),
);

export const PATCH = route(
	{ auth: 'session', params: InvoiceParamsSchema, body: UpdateInvoiceSchema },
	async ({ caller, params, body }) =>
		invoiceService.updateInvoice(await requireSelf(params.user, caller), params.id, body),
);

export const DELETE = route({ auth: 'session', params: InvoiceParamsSchema }, async ({ caller, params }) => {
	await invoiceService.deleteInvoice(await requireSelf(params.user, caller), params.id);
});
