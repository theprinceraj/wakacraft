import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateInvoiceSchema } from '@/server/invoice/invoice.request.dto';
import { invoiceService } from '@/server/invoice/invoice.service';

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ caller, params }) =>
	invoiceService.listInvoices(await requireSelf(params.user, caller)),
);

export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: CreateInvoiceSchema, status: 201 },
	async ({ caller, params, body }) => invoiceService.createInvoice(await requireSelf(params.user, caller), body),
);
