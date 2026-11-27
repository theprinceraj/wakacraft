import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as postDataDump } from '@/app/api/v1/users/[user]/data_dumps/route';
import { POST as postBulk } from '@/app/api/v1/users/[user]/heartbeats.bulk/route';
import { GET as getSummaries } from '@/app/api/v1/users/[user]/summaries/route';
import { GET as getShareChart } from '@/app/share/[username]/[chart]/route';
import { rateLimitKey } from '@/lib/http/authenticate';
import { connectMongo } from '@/lib/mongo/connection';
import { mongoRateLimitService } from '@/lib/mongo/rate-limit/rate-limit.service';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { LIMITS, rateLimitService } from '@/server/rate-limit/rate-limit.service';

import { basicAuth, call, CLI_USER_AGENT } from './api';
import { signUpTestUser } from './users';

let userId: string;
let apiKey: string;
let readerId: string;
let readerKey: string;

/** Calls a handler and keeps the raw response, for its headers. */
async function send(
	handler: (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
	path: string,
	params: Record<string, string>,
	init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
) {
	const request = new NextRequest(new URL(path, 'http://localhost:3000'), {
		method: init.method ?? 'GET',
		headers: { 'content-type': 'application/json', ...init.headers },
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
	});
	return handler(request, { params: Promise.resolve(params) });
}

beforeAll(async () => {
	await connectMongo();
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'limits@wakacraft.test', name: 'Limited' } }));
	({ key: apiKey } = await apiKeyService.create(userId, 'limits'));
	({
		user: { id: readerId },
	} = await signUpTestUser({ body: { email: 'reader@wakacraft.test', name: 'Reader' } }));
	({ key: readerKey } = await apiKeyService.create(readerId, 'reader'));
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

	it('limits aggregate reads per user through the route option, with Retry-After', async () => {
		const path = '/api/v1/users/current/summaries?range=Today';
		const ok = await send(getSummaries, path, { user: 'current' }, { headers: basicAuth(readerKey) });
		expect(ok.status).toBe(200);

		// The request above used one unit; use up the rest.
		await rateLimitService.consume(readerId, 'aggregate', LIMITS.aggregate.limit - 1);
		const limited = await send(getSummaries, path, { user: 'current' }, { headers: basicAuth(readerKey) });
		expect(limited.status).toBe(429);
		expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
		expect(Number(limited.headers.get('retry-after'))).toBeLessThanOrEqual(LIMITS.aggregate.windowSeconds);
		expect((await limited.json()).error).toMatch(/Rate limit/);

		// Buckets are independent: the reader can still create an export.
		const dump = await send(
			postDataDump,
			'/api/v1/users/current/data_dumps',
			{ user: 'current' },
			{
				method: 'POST',
				headers: basicAuth(readerKey),
				body: { type: 'heartbeats' },
			},
		);
		expect(dump.status).toBe(201);
	});

	it('limits data dump creation', async () => {
		await rateLimitService.consume(userId, 'data_dumps', LIMITS.data_dumps.limit);
		const response = await send(
			postDataDump,
			'/api/v1/users/current/data_dumps',
			{ user: 'current' },
			{
				method: 'POST',
				headers: basicAuth(apiKey),
				body: { type: 'heartbeats' },
			},
		);
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBeTruthy();
	});

	describe('anonymous public endpoints', () => {
		const params = { username: 'nobody-here', chart: 'total.svg' };
		const path = '/share/nobody-here/total.svg';
		const share = (headers: Record<string, string>) => send(getShareChart, path, params, { headers });
		const ipBuckets = () => mongoRateLimitService.count({ key: { $regex: '^public:ip:' } });

		afterEach(() => vi.unstubAllEnvs());

		it('are limited per x-vercel-forwarded-for client IP', async () => {
			await rateLimitService.consume('ip:203.0.113.7', 'public', LIMITS.public.limit);

			const limited = await share({ 'x-vercel-forwarded-for': '203.0.113.7' });
			expect(limited.status).toBe(429);
			expect(limited.headers.get('retry-after')).toBeTruthy();

			// Another client still gets through (to a 404 for the unknown user).
			expect((await share({ 'x-vercel-forwarded-for': '198.51.100.2' })).status).toBe(404);
		});

		it('fall back to x-real-ip, and ignore a spoofed x-forwarded-for without TRUST_PROXY', async () => {
			await rateLimitService.consume('ip:203.0.113.8', 'public', LIMITS.public.limit);
			// Rotating x-forwarded-for does not escape the real client's exhausted bucket…
			for (const spoofed of ['192.0.2.1', '192.0.2.2'])
				expect((await share({ 'x-real-ip': '203.0.113.8', 'x-forwarded-for': spoofed })).status).toBe(429);

			// …and on its own creates no buckets at all: with no trustworthy IP the request is not counted.
			const before = await ipBuckets();
			expect((await share({ 'x-forwarded-for': '192.0.2.3' })).status).toBe(404);
			expect((await share({})).status).toBe(404);
			expect(await ipBuckets()).toBe(before);
		});

		it('read x-forwarded-for when TRUST_PROXY=true', async () => {
			vi.stubEnv('TRUST_PROXY', 'true');
			await rateLimitService.consume('ip:203.0.113.9', 'public', LIMITS.public.limit);
			expect((await share({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })).status).toBe(429);
			expect((await share({ 'x-forwarded-for': '198.51.100.3' })).status).toBe(404);
		});
	});

	it('keys OAuth apps apart from the user and from each other', () => {
		expect(rateLimitKey({ userId: 'u1', via: 'api_key' })).toBe('u1');
		expect(rateLimitKey({ userId: 'u1', via: 'session' })).toBe('u1');
		expect(rateLimitKey({ userId: 'u1', via: 'oauth', appId: 'a1', scopes: [] })).toBe('u1:oauth:a1');
		expect(rateLimitKey({ userId: 'u1', via: 'oauth', appId: 'a2', scopes: [] })).toBe('u1:oauth:a2');
	});
});
