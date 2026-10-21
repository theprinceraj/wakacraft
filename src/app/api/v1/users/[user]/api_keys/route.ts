import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { CreateApiKeySchema } from '@/server/api-key/api-key.request.dto';
import { toApiKeyResponse } from '@/server/api-key/api-key.response.dto';
import { apiKeyService } from '@/server/api-key/api-key.service';

export const GET = route({ auth: 'session', params: UserParamSchema }, async ({ caller, params }) => ({
	data: (await apiKeyService.list(await requireSelf(params.user, caller))).map(toApiKeyResponse),
}));

/** The plaintext `key` is only ever returned here. */
export const POST = route(
	{ auth: 'session', params: UserParamSchema, body: CreateApiKeySchema, status: 201 },
	async ({ caller, params, body }) => {
		const { key, apiKey } = await apiKeyService.create(await requireSelf(params.user, caller), body.name);
		return { data: { ...toApiKeyResponse(apiKey), key } };
	},
);
