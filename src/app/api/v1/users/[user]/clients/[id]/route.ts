import { requireSelf, route } from '@/lib/http/route';
import { ClientParamsSchema, UpdateClientSchema } from '@/server/invoice/invoice.request.dto';
import { invoiceService } from '@/server/invoice/invoice.service';

export const PATCH = route(
	{ auth: 'session', params: ClientParamsSchema, body: UpdateClientSchema },
	async ({ caller, params, body }) =>
		invoiceService.updateClient(await requireSelf(params.user, caller), params.id, body),
);

export const DELETE = route({ auth: 'session', params: ClientParamsSchema }, async ({ caller, params }) => {
	await invoiceService.deleteClient(await requireSelf(params.user, caller), params.id);
});
