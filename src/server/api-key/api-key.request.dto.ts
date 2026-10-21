import { z } from 'zod';

import { ApiKeyZodSchema } from '@/lib/mongo/zod';

export const CreateApiKeySchema = z.object({ name: ApiKeyZodSchema.shape.name.trim().min(1).max(100) });

export const ApiKeyParamsSchema = z.object({ user: z.string(), id: ApiKeyZodSchema.shape.id });
