import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { POST as postBulk } from '@/app/api/v1/users/[user]/heartbeats.bulk/route';
import { connectMongo } from '@/lib/mongo/connection';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { LIMITS, rateLimitService } from '@/server/rate-limit/rate-limit.service';

import { basicAuth, call, CLI_USER_AGENT } from './api';
import { signUpTestUser } from './users';

let userId: string;
let apiKey: string;

beforeAll(async () => {
	await connectMongo();
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'limits@wakacraft.test', name: 'Limited' } }));
	({ key: apiKey } = await apiKeyService.create(userId, 'limits'));
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('rate limiting', () => {
	it('allows up to the limit per window, then refuses until the next window', async () => {
		const { limit, windowSeconds } = LIMITS.heartbeats;
		const windowStart = Math.floor(Date.UTC(2020, 0, 1) / (windowSeconds * 1000)) * windowSeconds * 1000;
		await rateLimitService.consume('someone', 'heartbeats', limit, windowStart);
		await expect(rateLimitService.consume('someone', 'heartbeats', 1, windowStart + 1000)).rejects.toMatchObject({
			status: 429,
			retryAfter: windowSeconds - 1,
		});
		// Other users and the next window are unaffected.
		await rateLimitService.consume('someone-else', 'heartbeats', 1, windowStart);
		await rateLimitService.consume('someone', 'heartbeats', 1, windowStart + windowSeconds * 1000);
	});

	it('answers the bulk endpoint with 429 and Retry-After once exhausted', async () => {
		await rateLimitService.consume(userId, 'heartbeats', LIMITS.heartbeats.limit);
		const { status, json } = await call(postBulk, {
			path: '/api/v1/users/current/heartbeats.bulk',
			method: 'POST',
			headers: { ...basicAuth(apiKey), 'user-agent': CLI_USER_AGENT },
			body: [{ entity: '/src/a.ts', type: 'file', time: Date.now() / 1000 }],
		});
		expect(status).toBe(429);
		expect(json.error).toMatch(/Rate limit/);
	});
});
