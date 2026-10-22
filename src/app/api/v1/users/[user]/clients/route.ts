import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateClientSchema } from '@/server/invoice/invoice.request.dto';
import { invoiceService } from '@/server/invoice/invoice.service';

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ caller, params }) =>
	invoiceService.listClients(await requireSelf(params.user, caller)),
);

export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: CreateClientSchema, status: 201 },
	async ({ caller, params, body }) => invoiceService.createClient(await requireSelf(params.user, caller), body),
);
