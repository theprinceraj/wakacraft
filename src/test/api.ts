import { NextRequest } from 'next/server';

type Handler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

export const CLI_USER_AGENT =
	'wakatime/v1.102.1 (windows-10.0.26100-x86_64) go1.24.1 vscode/1.98.0 vscode-wakatime/25.0.0';

/** Invokes a route handler the way Next would, returning status and parsed JSON. */
export async function call(
	handler: Handler,
	{
		path,
		params = {},
		method = 'GET',
		body,
		headers = {},
	}: {
		path: string;
		params?: Record<string, string>;
		method?: string;
		body?: unknown;
		headers?: Record<string, string>;
	},
) {
	const request = new NextRequest(new URL(path, 'http://localhost:3000'), {
		method,
		headers: { 'content-type': 'application/json', ...headers },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const response = await handler(request, { params: Promise.resolve({ user: 'current', ...params }) });
	const text = await response.text();
	return { status: response.status, json: text ? JSON.parse(text) : undefined };
}

/** `Authorization` header exactly as wakatime-cli builds it. */
export const basicAuth = (apiKey: string) => ({ authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` });
