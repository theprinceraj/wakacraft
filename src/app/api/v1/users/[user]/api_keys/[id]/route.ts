import { requireSelf, route } from '@/lib/http/route';
import { ApiKeyParamsSchema } from '@/server/api-key/api-key.request.dto';
import { apiKeyService } from '@/server/api-key/api-key.service';

export const DELETE = route({ auth: 'session', params: ApiKeyParamsSchema }, async ({ caller, params }) => {
	await apiKeyService.revoke(await requireSelf(params.user, caller), params.id);
});
