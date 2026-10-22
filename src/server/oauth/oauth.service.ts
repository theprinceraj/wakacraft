import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { BadRequestException, NotFoundException } from '@/lib/http/errors';
import { mongoOAuthAppService } from '@/lib/mongo/oauth-app/oauth-app.service';
import { mongoOAuthCodeService } from '@/lib/mongo/oauth-code/oauth-code.service';
import { mongoOAuthTokenService } from '@/lib/mongo/oauth-token/oauth-token.service';
import {
	ACCESS_TOKEN_PREFIX,
	CLIENT_SECRET_PREFIX,
	isOAuthScope,
	OAuthScopeDescriptions,
	REFRESH_TOKEN_PREFIX,
	type OAuthScope,
} from '@/lib/util/OAuth';

import type { IOAuthAppZodSchema } from '@/lib/mongo/zod';
import type { AuthorizeQuery, OAuthAppInput, RevokeRequest, TokenRequest } from './oauth.request.dto';

const CODE_TTL_MS = 10 * 60_000;
const ACCESS_TTL_SECONDS = 60 * 86_400;
const MAX_APPS_PER_USER = 20;
/** Writing `lastUsedAt` on every request would turn reads into writes; once a minute is plenty for display. */
const LAST_USED_RESOLUTION_MS = 60_000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const token = (prefix: string) => `${prefix}${randomBytes(32).toString('base64url')}`;

const safeEqual = (a: string, b: string) => {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
};

/** RFC 6749 errors: `error` is the machine-readable code clients switch on. */
export class OAuthError extends Error {
	public constructor(
		public readonly code:
			| 'invalid_request'
			| 'invalid_client'
			| 'invalid_grant'
			| 'invalid_scope'
			| 'unsupported_grant_type'
			| 'unsupported_response_type'
			| 'access_denied',
		message: string,
		public readonly status = 400,
	) {
		super(message);
		this.name = 'OAuthError';
	}
}

export interface OAuthCaller {
	userId: string;
	appId: string;
	scopes: OAuthScope[];
}

function toAppResponse(app: IOAuthAppZodSchema) {
	return {
		id: app.id,
		name: app.name,
		description: app.description ?? null,
		website: app.website ?? null,
		redirect_uris: app.redirectUris,
		client_id: app.clientId,
		created_at: app.createdAt.toISOString(),
		modified_at: app.updatedAt.toISOString(),
	};
}

export type OAuthAppResponse = ReturnType<typeof toAppResponse>;

class OAuthService {
	// --- apps (developer side) ------------------------------------------------------------------------------------

	public async listApps(ownerId: string) {
		const apps = await mongoOAuthAppService.find({ ownerId }, '', { sort: { createdAt: 1 } });
		return { data: apps.map(toAppResponse) };
	}

	/** The client secret is returned once, here; only its hash is kept. */
	public async createApp(ownerId: string, input: OAuthAppInput & { name: string; redirectUris: string[] }) {
		if ((await mongoOAuthAppService.count({ ownerId })) >= MAX_APPS_PER_USER) {
			throw new BadRequestException(`You can register at most ${MAX_APPS_PER_USER} apps`);
		}
		const secret = token(CLIENT_SECRET_PREFIX);
		const app = await mongoOAuthAppService.create({
			ownerId,
			name: input.name,
			description: input.description ?? undefined,
			website: input.website ?? undefined,
			redirectUris: input.redirectUris,
			clientId: randomBytes(18).toString('base64url'),
			clientSecretHash: sha256(secret),
		});
		return { data: { ...toAppResponse(app), client_secret: secret } };
	}

	public async updateApp(ownerId: string, appId: string, input: OAuthAppInput) {
		const app = await mongoOAuthAppService.updateOne(
			{ id: appId, ownerId },
			{
				$set: {
					...(input.name ? { name: input.name } : {}),
					...(input.redirectUris ? { redirectUris: input.redirectUris } : {}),
					...(input.description ? { description: input.description } : {}),
					...(input.website ? { website: input.website } : {}),
				},
				$unset: {
					...(input.description === null ? { description: 1 } : {}),
					...(input.website === null ? { website: 1 } : {}),
				},
			},
		);
		if (!app) throw new NotFoundException('App not found');
		return { data: toAppResponse(app) };
	}

	/** Issues a new secret; the old one stops working immediately. Existing tokens stay valid. */
	public async rotateSecret(ownerId: string, appId: string) {
		const secret = token(CLIENT_SECRET_PREFIX);
		const app = await mongoOAuthAppService.updateOne(
			{ id: appId, ownerId },
			{ $set: { clientSecretHash: sha256(secret) } },
		);
		if (!app) throw new NotFoundException('App not found');
		return { data: { ...toAppResponse(app), client_secret: secret } };
	}

	/** Deleting an app signs it out of every account that authorized it. */
	public async deleteApp(ownerId: string, appId: string) {
		const app = await mongoOAuthAppService.findOne({ id: appId, ownerId }, ['id']);
		if (!app) throw new NotFoundException('App not found');
		await Promise.all([
			mongoOAuthAppService.deleteOne({ id: appId }, 'id'),
			mongoOAuthTokenService.deleteMany({ appId }),
			mongoOAuthCodeService.deleteMany({ appId }),
		]);
	}

	// --- authorization (user side) --------------------------------------------------------------------------------

	/**
	 * Validates an authorization request. Problems with the client or redirect URI are thrown (and shown on our own
	 * page — never redirected to an unverified URI); problems after that are returned for the client's redirect.
	 */
	public async describeAuthorization(query: AuthorizeQuery) {
		const app = await mongoOAuthAppService.findOne({ clientId: query.client_id });
		if (!app) throw new OAuthError('invalid_client', 'Unknown client_id');
		if (!app.redirectUris.includes(query.redirect_uri)) {
			throw new OAuthError('invalid_request', 'redirect_uri is not registered for this app');
		}

		let problem: OAuthError | null = null;
		const unknown = query.scope.filter((scope) => !isOAuthScope(scope));
		if (query.response_type !== 'code') {
			problem = new OAuthError('unsupported_response_type', 'Only response_type=code is supported');
		} else if (unknown.length) {
			problem = new OAuthError('invalid_scope', `Unknown scope: ${unknown.join(', ')}`);
		} else if (query.code_challenge_method && !query.code_challenge) {
			problem = new OAuthError('invalid_request', 'code_challenge_method needs a code_challenge');
		}

		return {
			app: { name: app.name, description: app.description ?? null, website: app.website ?? null },
			appId: app.id,
			scopes: (query.scope.filter(isOAuthScope) as OAuthScope[]).map((scope) => ({
				scope,
				description: OAuthScopeDescriptions[scope],
			})),
			problem,
		};
	}

	/** The user approved: returns where to send their browser, carrying a one-time code. */
	public async approve(userId: string, query: AuthorizeQuery): Promise<string> {
		const described = await this.describeAuthorization(query);
		if (described.problem) return this.errorRedirect(query, described.problem);

		const code = randomBytes(32).toString('base64url');
		await mongoOAuthCodeService.create({
			codeHash: sha256(code),
			appId: described.appId,
			userId,
			scopes: described.scopes.map((item) => item.scope),
			redirectUri: query.redirect_uri,
			codeChallenge: query.code_challenge,
			codeChallengeMethod: query.code_challenge ? (query.code_challenge_method ?? 'plain') : undefined,
			expiresAt: new Date(Date.now() + CODE_TTL_MS),
		});
		const url = new URL(query.redirect_uri);
		url.searchParams.set('code', code);
		if (query.state) url.searchParams.set('state', query.state);
		return url.toString();
	}

	public async deny(query: AuthorizeQuery): Promise<string> {
		await this.describeAuthorization(query);
		return this.errorRedirect(query, new OAuthError('access_denied', 'The user denied access'));
	}

	public errorRedirect(query: AuthorizeQuery, error: OAuthError): string {
		const url = new URL(query.redirect_uri);
		url.searchParams.set('error', error.code);
		url.searchParams.set('error_description', error.message);
		if (query.state) url.searchParams.set('state', query.state);
		return url.toString();
	}

	// --- token endpoint -------------------------------------------------------------------------------------------

	public async exchange(request: TokenRequest) {
		const app = await mongoOAuthAppService.findByClientIdWithSecret(request.client_id);
		if (!app) throw new OAuthError('invalid_client', 'Unknown client', 401);
		const secretOk =
			request.client_secret !== undefined && safeEqual(sha256(request.client_secret), app.clientSecretHash);
		if (request.client_secret !== undefined && !secretOk) {
			throw new OAuthError('invalid_client', 'Invalid client credentials', 401);
		}

		if (request.grant_type === 'authorization_code') {
			// Single use: whoever deletes the code first gets the tokens.
			const code = await mongoOAuthCodeService.consume(sha256(request.code), app.id);
			if (!code || code.expiresAt.getTime() < Date.now()) {
				throw new OAuthError('invalid_grant', 'The code is invalid, expired or already used');
			}
			if (code.redirectUri !== request.redirect_uri) throw new OAuthError('invalid_grant', 'redirect_uri mismatch');
			if (code.codeChallenge) {
				if (!request.code_verifier) throw new OAuthError('invalid_request', 'code_verifier is required');
				const expected =
					code.codeChallengeMethod === 'S256'
						? createHash('sha256').update(request.code_verifier).digest('base64url')
						: request.code_verifier;
				if (!safeEqual(expected, code.codeChallenge)) throw new OAuthError('invalid_grant', 'code_verifier mismatch');
			} else if (!secretOk) {
				throw new OAuthError('invalid_client', 'client_secret is required', 401);
			}
			return this.issue(app.id, code.userId, code.scopes as OAuthScope[]);
		}

		if (!secretOk) throw new OAuthError('invalid_client', 'client_secret is required', 401);
		const existing = await mongoOAuthTokenService.findOne({
			refreshTokenHash: sha256(request.refresh_token),
			appId: app.id,
		});
		if (!existing) throw new OAuthError('invalid_grant', 'Unknown refresh token');
		// Refreshing rotates both tokens; the old pair stops working.
		await mongoOAuthTokenService.deleteOne({ id: existing.id }, 'id');
		return this.issue(app.id, existing.userId, existing.scopes as OAuthScope[]);
	}

	private async issue(appId: string, userId: string, scopes: OAuthScope[]) {
		const accessToken = token(ACCESS_TOKEN_PREFIX);
		const refreshToken = token(REFRESH_TOKEN_PREFIX);
		const expiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000);
		await mongoOAuthTokenService.create({
			appId,
			userId,
			scopes,
			accessTokenHash: sha256(accessToken),
			refreshTokenHash: sha256(refreshToken),
			accessExpiresAt: expiresAt,
		});
		return {
			access_token: accessToken,
			refresh_token: refreshToken,
			uid: userId,
			token_type: 'bearer',
			expires_at: expiresAt.toISOString(),
			expires_in: ACCESS_TTL_SECONDS,
			scope: scopes.join(','),
		};
	}

	/** RFC 7009: always succeeds for a valid client, whether or not the token existed. */
	public async revoke(request: RevokeRequest) {
		const app = await mongoOAuthAppService.findByClientIdWithSecret(request.client_id);
		if (!app || !request.client_secret || !safeEqual(sha256(request.client_secret), app.clientSecretHash)) {
			throw new OAuthError('invalid_client', 'Invalid client credentials', 401);
		}
		if (!request.token) return;
		const hash = sha256(request.token);
		const found = await mongoOAuthTokenService.findOne({
			appId: app.id,
			$or: [{ accessTokenHash: hash }, { refreshTokenHash: hash }],
		});
		if (!found) return;
		await mongoOAuthTokenService.deleteMany(request.all ? { appId: app.id, userId: found.userId } : { id: found.id });
	}

	/** Who an access token acts for, or null if it's unknown or expired. */
	public async resolveAccessToken(accessToken: string): Promise<OAuthCaller | null> {
		const found = await mongoOAuthTokenService.findOne({ accessTokenHash: sha256(accessToken) });
		if (!found || found.accessExpiresAt.getTime() < Date.now()) return null;
		if (!found.lastUsedAt || Date.now() - found.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
			void mongoOAuthTokenService
				.updateOne({ id: found.id }, { $set: { lastUsedAt: new Date() } })
				.catch(() => undefined);
		}
		return { userId: found.userId, appId: found.appId, scopes: found.scopes as OAuthScope[] };
	}

	// --- the user's authorized apps -------------------------------------------------------------------------------

	public async listAuthorizations(userId: string) {
		const tokens = await mongoOAuthTokenService.find({ userId });
		const apps = await mongoOAuthAppService.find({ id: { $in: [...new Set(tokens.map((t) => t.appId))] } });
		const data = apps.map((app) => {
			const mine = tokens.filter((t) => t.appId === app.id);
			const lastUsed = mine.map((t) => t.lastUsedAt?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0);
			return {
				app_id: app.id,
				name: app.name,
				website: app.website ?? null,
				scopes: [...new Set(mine.flatMap((t) => t.scopes))],
				authorized_at: new Date(Math.min(...mine.map((t) => t.createdAt.getTime()))).toISOString(),
				last_used_at: lastUsed ? new Date(lastUsed).toISOString() : null,
			};
		});
		return { data };
	}

	public async revokeAuthorization(userId: string, appId: string) {
		await mongoOAuthTokenService.deleteMany({ userId, appId });
	}
}

export const oauthService = new OAuthService();
