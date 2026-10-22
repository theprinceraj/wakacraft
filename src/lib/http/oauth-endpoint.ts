import { NextResponse, type NextRequest } from 'next/server';

import { connectMongo } from '@/lib/mongo/connection';
import { OAuthError } from '@/server/oauth/oauth.service';

import type { output, ZodType } from 'zod';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
};

/** Reads an OAuth request body: form-encoded per RFC 6749, or JSON, which many clients send. */
async function readParams(request: NextRequest): Promise<Record<string, string>> {
	const type = request.headers.get('content-type') ?? '';
	const params: Record<string, string> = {};
	if (type.includes('application/json')) {
		const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
		for (const [key, value] of Object.entries(json)) if (value != null) params[key] = String(value);
	} else {
		new URLSearchParams(await request.text()).forEach((value, key) => (params[key] = value));
	}

	// Client credentials may come as HTTP Basic instead of in the body (RFC 6749 §2.3.1).
	const header = request.headers.get('authorization');
	if (header?.toLowerCase().startsWith('basic ')) {
		const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
		const separator = decoded.indexOf(':');
		if (separator > 0) {
			params.client_id ??= decodeURIComponent(decoded.slice(0, separator));
			params.client_secret ??= decodeURIComponent(decoded.slice(separator + 1));
		}
	}
	return params;
}

/**
 * WakaTime answers its token endpoint form-encoded unless the client asks for JSON; JSON-speaking clients either send
 * `Accept: application/json` or a JSON body, so both get JSON back.
 */
function respond(request: NextRequest, body: Record<string, unknown>, status: number) {
	const wantsJson =
		(request.headers.get('accept') ?? '').includes('application/json') ||
		(request.headers.get('content-type') ?? '').includes('application/json');
	const headers = { ...CORS, 'Cache-Control': 'no-store' };
	if (wantsJson) return NextResponse.json(body, { status, headers });
	const form = new URLSearchParams(
		Object.entries(body).flatMap(([key, value]) => (value == null ? [] : [[key, String(value)]])),
	);
	return new NextResponse(form.toString(), {
		status,
		headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
	});
}

/** Route handler for an OAuth endpoint (`/oauth/token`, `/oauth/revoke`): RFC 6749 errors, not wakacraft's. */
export function oauthEndpoint<S extends ZodType>(
	schema: S,
	handler: (input: output<S>) => Promise<Record<string, unknown> | void>,
) {
	return async (request: NextRequest) => {
		try {
			await connectMongo();
			const parsed = schema.safeParse(await readParams(request));
			if (!parsed.success) {
				const issue = parsed.error.issues[0];
				const unsupported = issue?.path[0] === 'grant_type';
				throw new OAuthError(
					unsupported ? 'unsupported_grant_type' : 'invalid_request',
					unsupported ? 'Unsupported grant_type' : `${issue?.path.join('.') || 'request'}: ${issue?.message}`,
				);
			}
			return respond(request, (await handler(parsed.data)) ?? {}, 200);
		} catch (error) {
			if (error instanceof OAuthError) {
				return respond(request, { error: error.code, error_description: error.message }, error.status);
			}
			console.error(`[${request.nextUrl.pathname}]`, error);
			return respond(request, { error: 'server_error' }, 500);
		}
	};
}

export const oauthPreflight = () => new NextResponse(null, { status: 204, headers: CORS });
