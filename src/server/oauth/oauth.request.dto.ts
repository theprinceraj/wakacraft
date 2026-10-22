import { z } from 'zod';

import { OAuthAppZodSchema } from '@/lib/mongo/zod';

/** Redirect URIs must be https, or http on a loopback host for native and local development clients. */
const redirectUri = z
	.url()
	.max(2048)
	.refine((value) => {
		const url = new URL(value);
		if (url.hash) return false;
		if (url.protocol === 'https:') return true;
		return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	}, 'Use an https URL (http is allowed only for localhost), without a #fragment');

const appFields = {
	name: OAuthAppZodSchema.shape.name.trim().min(1).max(80),
	description: z.string().trim().max(500).nullish(),
	website: z.url().max(2048).nullish(),
	redirect_uris: z.array(redirectUri).min(1).max(10),
};

export const CreateOAuthAppSchema = z
	.object(appFields)
	.transform(({ redirect_uris, ...rest }) => ({ ...rest, redirectUris: [...new Set(redirect_uris)] }));

export const UpdateOAuthAppSchema = z
	.object(appFields)
	.partial()
	.transform(({ redirect_uris, ...rest }) => ({
		...rest,
		redirectUris: redirect_uris ? [...new Set(redirect_uris)] : undefined,
	}));

export type OAuthAppInput = z.output<typeof UpdateOAuthAppSchema>;

export const OAuthAppParamsSchema = z.object({ user: z.string().min(1), app: OAuthAppZodSchema.shape.id });

/** Scopes arrive comma- or space-separated (WakaTime documents commas; RFC 6749 uses spaces). */
const scopeList = z
	.string()
	.max(1000)
	.transform((value) => [...new Set(value.split(/[\s,]+/).filter(Boolean))]);

export const AuthorizeQuerySchema = z.object({
	client_id: z.string().min(1).max(128),
	response_type: z.string(),
	redirect_uri: z.string().min(1).max(2048),
	scope: scopeList.default([]),
	state: z.string().max(1024).optional(),
	code_challenge: z
		.string()
		.regex(/^[\w.~-]{43,128}$/, 'Invalid code_challenge')
		.optional(),
	code_challenge_method: z.enum(['S256', 'plain']).optional(),
});

export type AuthorizeQuery = z.output<typeof AuthorizeQuerySchema>;

export const TokenRequestSchema = z.discriminatedUnion('grant_type', [
	z.object({
		grant_type: z.literal('authorization_code'),
		client_id: z.string().min(1).max(128),
		client_secret: z.string().max(256).optional(),
		code: z.string().min(1).max(256),
		redirect_uri: z.string().min(1).max(2048),
		code_verifier: z.string().min(43).max(128).optional(),
	}),
	z.object({
		grant_type: z.literal('refresh_token'),
		client_id: z.string().min(1).max(128),
		client_secret: z.string().max(256).optional(),
		refresh_token: z.string().min(1).max(256),
	}),
]);

export type TokenRequest = z.output<typeof TokenRequestSchema>;

export const RevokeRequestSchema = z.object({
	client_id: z.string().min(1).max(128),
	client_secret: z.string().max(256).optional(),
	token: z.string().max(256).optional(),
	/** WakaTime extension: revoke every token the app holds for that token's user. */
	all: z.stringbool().optional(),
});

export type RevokeRequest = z.output<typeof RevokeRequestSchema>;

export const AuthorizationParamsSchema = z.object({ user: z.string().min(1), app: OAuthAppZodSchema.shape.id });
