import { createHash, randomUUID } from 'node:crypto';

import { mongoApiKeyService } from '@/lib/mongo/api-key/api-key.service';
import { BadRequestException, NotFoundException } from '@/lib/http/errors';

import type { IApiKeyZodSchema } from '@/lib/mongo/zod';

const hashKey = (key: string) => createHash('sha256').update(key.toLowerCase()).digest('hex');

/** `lastUsedAt` is only rewritten when stale, so a busy plugin doesn't turn every heartbeat into two writes. */
const LAST_USED_RESOLUTION_MS = 5 * 60 * 1000;

const MAX_KEYS_PER_USER = 20;

class ApiKeyService {
	public async list(userId: string): Promise<IApiKeyZodSchema[]> {
		return mongoApiKeyService.find({ userId }, '', { sort: { createdAt: -1 } });
	}

	/** Returns the plaintext key exactly once; only its hash is stored. */
	public async create(userId: string, name: string): Promise<{ key: string; apiKey: IApiKeyZodSchema }> {
		const count = await mongoApiKeyService.count({ userId });
		if (count >= MAX_KEYS_PER_USER) throw new BadRequestException(`You can have at most ${MAX_KEYS_PER_USER} API keys`);

		// wakatime-cli validates the key format: an optional `waka_` prefix followed by a UUID.
		const key = `waka_${randomUUID()}`;
		const apiKey = await mongoApiKeyService.create({ userId, name, keyHash: hashKey(key), keyPreview: key.slice(-4) });
		const { keyHash: _keyHash, ...withoutHash } = apiKey;
		return { key, apiKey: withoutHash as IApiKeyZodSchema };
	}

	public async revoke(userId: string, id: string): Promise<void> {
		const deleted = await mongoApiKeyService.deleteOne({ userId, id }, 'id');
		if (!deleted) throw new NotFoundException('API key not found');
	}

	public async resolve(key: string): Promise<{ userId: string; id: string } | null> {
		const apiKey = await mongoApiKeyService.findOne({ keyHash: hashKey(key) }, ['id', 'userId', 'lastUsedAt']);
		if (!apiKey) return null;

		if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
			void mongoApiKeyService.updateMany({ id: apiKey.id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
		}
		return { userId: apiKey.userId, id: apiKey.id };
	}
}

export const apiKeyService = new ApiKeyService();
