import { createHash } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getCustomRules } from '@/app/api/v1/users/[user]/custom_rules/route';
import { GET as getUser } from '@/app/api/v1/users/[user]/route';
import { GET as getStats } from '@/app/api/v1/users/[user]/stats/route';
import { GET as getSummaries } from '@/app/api/v1/users/[user]/summaries/route';
import { POST as revokeEndpoint } from '@/app/oauth/revoke/route';
import { POST as tokenEndpoint } from '@/app/oauth/token/route';
import { connectMongo } from '@/lib/mongo/connection';
import { todayIn } from '@/lib/util/Time';
import { AuthorizeQuerySchema, CreateOAuthAppSchema } from '@/server/oauth/oauth.request.dto';
import { oauthService } from '@/server/oauth/oauth.service';

import { call } from './api';
import { signUpTestUser } from './users';

const REDIRECT = 'https://client.example/callback';
let developerId: string;
let userId: string;
let clientId: string;
let clientSecret: string;

async function postForm(
	handler: (request: NextRequest) => Promise<Response>,
	path: string,
	form: Record<string, string>,
	json = false,
) {
	const response = await handler(
		new NextRequest(new URL(path, 'http://localhost:3000'), {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				...(json ? { accept: 'application/json' } : {}),
			},
			body: new URLSearchParams(form).toString(),
		}),
	);
	const text = await response.text();
	const body =
		json || response.headers.get('content-type')?.includes('json')
			? JSON.parse(text)
			: Object.fromEntries(new URLSearchParams(text));
	return { status: response.status, body };
}

const authorize = (extra: Record<string, string> = {}) =>
	AuthorizeQuerySchema.parse({
		client_id: clientId,
		response_type: 'code',
		redirect_uri: REDIRECT,
		scope: 'read_summaries,email',
		state: 'xyz',
		...extra,
	});

const codeFrom = (url: string) => new URL(url).searchParams.get('code')!;
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const today = todayIn('UTC');

beforeAll(async () => {
	await connectMongo();
	({
		user: { id: developerId },
	} = await signUpTestUser({ body: { email: 'oauth-dev@wakacraft.test', name: 'Developer' } }));
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'oauth-user@wakacraft.test', name: 'End User' } }));
	const { data } = await oauthService.createApp(
		developerId,
		CreateOAuthAppSchema.parse({ name: 'Stat Cards', redirect_uris: [REDIRECT] }),
	);
	clientId = data.client_id;
	clientSecret = data.client_secret;
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('oauth apps', () => {
	it('only accepts https or loopback redirect URIs', () => {
		expect(CreateOAuthAppSchema.safeParse({ name: 'x', redirect_uris: ['http://evil.example/cb'] }).success).toBe(
			false,
		);
		expect(CreateOAuthAppSchema.safeParse({ name: 'x', redirect_uris: ['http://localhost:5173/cb'] }).success).toBe(
			true,
		);
	});

	it('refuses unknown clients and unregistered redirect URIs instead of redirecting', async () => {
		await expect(oauthService.describeAuthorization(authorize({ client_id: 'nope' }))).rejects.toThrow(/client_id/);
		await expect(
			oauthService.describeAuthorization(authorize({ redirect_uri: 'https://evil.example/cb' })),
		).rejects.toThrow(/redirect_uri/);
	});

	it('sends scope errors and denials back to the app', async () => {
		const bad = new URL(await oauthService.approve(userId, authorize({ scope: 'read_everything' })));
		expect(bad.searchParams.get('error')).toBe('invalid_scope');
		expect(bad.searchParams.get('state')).toBe('xyz');
		const denied = new URL(await oauthService.deny(authorize()));
		expect(denied.searchParams.get('error')).toBe('access_denied');
	});
});

describe('authorization code flow', () => {
	let accessToken: string;
	let refreshToken: string;

	it('exchanges a code for tokens, form-encoded like WakaTime', async () => {
		const redirect = await oauthService.approve(userId, authorize());
		expect(new URL(redirect).searchParams.get('state')).toBe('xyz');
		const code = codeFrom(redirect);

		const { status, body } = await postForm(tokenEndpoint, '/oauth/token', {
			grant_type: 'authorization_code',
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: REDIRECT,
		});
		expect(status).toBe(200);
		expect(body).toMatchObject({ uid: userId, token_type: 'bearer', scope: 'read_summaries,email' });
		expect(body.access_token).toMatch(/^waka_tok_/);
		expect(body.refresh_token).toMatch(/^waka_ref_/);
		accessToken = body.access_token;
		refreshToken = body.refresh_token;

		// Codes are single use.
		const again = await postForm(
			tokenEndpoint,
			'/oauth/token',
			{
				grant_type: 'authorization_code',
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: REDIRECT,
			},
			true,
		);
		expect(again).toMatchObject({ status: 400, body: { error: 'invalid_grant' } });
	});

	it('lets the token use exactly its scopes', async () => {
		const summaries = await call(getSummaries, {
			path: `/api/v1/users/current/summaries?start=${today}&end=${today}`,
			headers: bearer(accessToken),
		});
		expect(summaries.status).toBe(200);

		const stats = await call(getStats, { path: '/api/v1/users/current/stats', headers: bearer(accessToken) });
		expect(stats.status).toBe(403);
		expect(stats.json.error).toMatch(/read_stats/);

		const rules = await call(getCustomRules, {
			path: '/api/v1/users/current/custom_rules',
			headers: bearer(accessToken),
		});
		expect(rules.status).toBe(403);

		const me = await call(getUser, { path: '/api/v1/users/current', headers: bearer(accessToken) });
		expect(me.json.data).toMatchObject({ id: userId, email: 'oauth-user@wakacraft.test' });
	});

	it('hides the email without the email scope', async () => {
		const code = codeFrom(await oauthService.approve(userId, authorize({ scope: 'read_stats' })));
		const { body } = await postForm(
			tokenEndpoint,
			'/oauth/token',
			{
				grant_type: 'authorization_code',
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: REDIRECT,
			},
			true,
		);
		const me = await call(getUser, { path: '/api/v1/users/current', headers: bearer(body.access_token) });
		expect(me.json.data.email).toBeNull();
	});

	it('rotates tokens on refresh', async () => {
		const { status, body } = await postForm(
			tokenEndpoint,
			'/oauth/token',
			{ grant_type: 'refresh_token', client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken },
			true,
		);
		expect(status).toBe(200);
		expect(body.access_token).not.toBe(accessToken);
		const old = await call(getSummaries, {
			path: `/api/v1/users/current/summaries?start=${today}&end=${today}`,
			headers: bearer(accessToken),
		});
		expect(old.status).toBe(401);
		accessToken = body.access_token;
	});

	it('revokes tokens', async () => {
		const wrongSecret = await postForm(
			revokeEndpoint,
			'/oauth/revoke',
			{ client_id: clientId, client_secret: 'waka_sec_wrong', token: accessToken },
			true,
		);
		expect(wrongSecret.status).toBe(401);

		const { status } = await postForm(revokeEndpoint, '/oauth/revoke', {
			client_id: clientId,
			client_secret: clientSecret,
			token: accessToken,
		});
		expect(status).toBe(200);
		const after = await call(getSummaries, {
			path: `/api/v1/users/current/summaries?start=${today}&end=${today}`,
			headers: bearer(accessToken),
		});
		expect(after.status).toBe(401);
	});
});

describe('PKCE and authorized apps', () => {
	const verifier = 'v'.repeat(30) + 'erifier-for-pkce-0123456789';
	const challenge = createHash('sha256').update(verifier).digest('base64url');

	it('lets public clients exchange with a code verifier instead of a secret', async () => {
		const approve = () =>
			oauthService.approve(userId, authorize({ code_challenge: challenge, code_challenge_method: 'S256' }));
		const exchange = (code: string, code_verifier: string) =>
			postForm(
				tokenEndpoint,
				'/oauth/token',
				{ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: REDIRECT, code_verifier },
				true,
			);

		expect(await exchange(codeFrom(await approve()), `${verifier}x`)).toMatchObject({
			status: 400,
			body: { error: 'invalid_grant' },
		});
		const ok = await exchange(codeFrom(await approve()), verifier);
		expect(ok.status).toBe(200);

		// Without PKCE a secret is mandatory.
		const plain = codeFrom(await oauthService.approve(userId, authorize()));
		expect(
			await postForm(
				tokenEndpoint,
				'/oauth/token',
				{ grant_type: 'authorization_code', client_id: clientId, code: plain, redirect_uri: REDIRECT },
				true,
			),
		).toMatchObject({ status: 401, body: { error: 'invalid_client' } });
	});

	it('lists and revokes the apps a user authorized', async () => {
		const { data } = await oauthService.listAuthorizations(userId);
		expect(data).toHaveLength(1);
		expect(data[0]).toMatchObject({ name: 'Stat Cards' });
		expect(data[0].scopes).toEqual(expect.arrayContaining(['read_summaries', 'email']));

		await oauthService.revokeAuthorization(userId, data[0].app_id);
		expect((await oauthService.listAuthorizations(userId)).data).toEqual([]);
	});

	it('rejects unsupported grant types the RFC way', async () => {
		const { status, body } = await postForm(
			tokenEndpoint,
			'/oauth/token',
			{ grant_type: 'password', client_id: clientId },
			true,
		);
		expect(status).toBe(400);
		expect(body.error).toBe('unsupported_grant_type');
	});
});
