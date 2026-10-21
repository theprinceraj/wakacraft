import { z } from 'zod';

import { ApiKeyZodSchema, type IApiKeyZodSchema } from '@/lib/mongo/zod';

export const ApiKeyResponseSchema = ApiKeyZodSchema.pick({ id: true, name: true, keyPreview: true }).extend({
	last_used_at: z.iso.datetime().nullable(),
	created_at: z.iso.datetime(),
});

export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;

export const toApiKeyResponse = (apiKey: IApiKeyZodSchema): ApiKeyResponse => ({
	id: apiKey.id,
	name: apiKey.name,
	keyPreview: apiKey.keyPreview,
	last_used_at: apiKey.lastUsedAt?.toISOString() ?? null,
	created_at: apiKey.createdAt.toISOString(),
});
