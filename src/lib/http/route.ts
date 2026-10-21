import { NextResponse, type NextRequest } from 'next/server';
import { z, type ZodType } from 'zod';

import { connectMongo } from '@/lib/mongo/connection';

import { resolveCaller, type Caller } from './authenticate';
import { ForbiddenException, HttpError, UnauthorizedException } from './errors';

type AuthMode = 'required' | 'session' | 'optional' | 'none';

type Parsed<T> = T extends ZodType ? z.output<T> : undefined;

export interface RouteOptions<
	A extends AuthMode,
	Q extends ZodType | undefined,
	B extends ZodType | undefined,
	P extends ZodType | undefined,
> {
	/**
	 * `required`: session or API key. `session`: browser session only (account management). `optional`: caller may
	 * be null. `none`: no lookup at all.
	 */
	auth: A;
	query?: Q;
	body?: B;
	params?: P;
	/** Status for a successful non-`Response` result. */
	status?: number;
}

export interface HandlerContext<
	A extends AuthMode,
	Q extends ZodType | undefined,
	B extends ZodType | undefined,
	P extends ZodType | undefined,
> {
	request: NextRequest;
	caller: A extends 'required' | 'session' ? Caller : Caller | null;
	query: Parsed<Q>;
	body: Parsed<B>;
	params: Parsed<P>;
}

type NextRouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

function validationError(error: z.ZodError): Response {
	const { formErrors, fieldErrors } = z.flattenError(error);
	const errors = Object.fromEntries(
		Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])),
	);
	if (formErrors.length) errors._ = formErrors;

	return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request', errors }, { status: 400 });
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
	const text = await request.text();
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		throw new HttpError(400, 'Request body is not valid JSON');
	}
}

/**
 * Wraps a route handler the way the Nest stack did for controllers: authenticate, validate query/body/params
 * against zod schemas, call the service, serialize. Handlers stay one-liners that delegate to `src/server/*`.
 */
export function route<
	A extends AuthMode,
	Q extends ZodType | undefined = undefined,
	B extends ZodType | undefined = undefined,
	P extends ZodType | undefined = undefined,
>(options: RouteOptions<A, Q, B, P>, handler: (context: HandlerContext<A, Q, B, P>) => Promise<unknown>) {
	return async (request: NextRequest, routeContext: NextRouteContext): Promise<Response> => {
		try {
			await connectMongo();

			let caller: Caller | null = null;
			if (options.auth !== 'none') {
				caller = await resolveCaller(request);
				if (!caller && options.auth !== 'optional') throw new UnauthorizedException();
				if (caller && options.auth === 'session' && caller.via !== 'session') {
					throw new ForbiddenException('This endpoint requires signing in on the website');
				}
			}

			const parse = (schema: ZodType | undefined, input: unknown) => {
				if (!schema) return { success: true as const, data: undefined };
				return schema.safeParse(input);
			};

			const params = parse(options.params, await routeContext.params);
			if (!params.success) return validationError(params.error);

			const query = parse(options.query, Object.fromEntries(request.nextUrl.searchParams));
			if (!query.success) return validationError(query.error);

			const body = parse(options.body, options.body ? await readJsonBody(request) : undefined);
			if (!body.success) return validationError(body.error);

			const result = await handler({
				request,
				caller: caller as HandlerContext<A, Q, B, P>['caller'],
				query: query.data as Parsed<Q>,
				body: body.data as Parsed<B>,
				params: params.data as Parsed<P>,
			});

			if (result instanceof Response) return result;
			if (result === undefined) return new Response(null, { status: options.status ?? 204 });
			return NextResponse.json(result, { status: options.status ?? 200 });
		} catch (error) {
			if (error instanceof HttpError) {
				return NextResponse.json(
					{ error: error.message, ...(error.errors ? { errors: error.errors } : {}) },
					{ status: error.status },
				);
			}
			console.error(`[${request.method} ${request.nextUrl.pathname}]`, error);
			return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
		}
	};
}

/** `:user` path segment: `current`, or the caller's own id/username. Other users' data comes later via public profiles. */
export const UserParamSchema = z.object({ user: z.string().min(1) });

export async function requireSelf(userParam: string, caller: Caller): Promise<string> {
	if (userParam === 'current' || userParam === caller.userId) return caller.userId;

	const { userProfileService } = await import('@/server/user/user-profile.service');
	const profile = await userProfileService.getProfile(caller.userId);
	if (profile.username && userParam.toLowerCase() === profile.username) return caller.userId;

	throw new ForbiddenException('You can only access your own data with this endpoint');
}
