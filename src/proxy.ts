import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

const APP_PATHS = ['/dashboard', '/projects', '/settings'];

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Machine-Name, TimeZone',
	'Access-Control-Max-Age': '86400',
};

/**
 * - API: CORS so the WakaTime browser extensions (which post from their own origin with an API key) work.
 *   Cookies are never sent cross-origin, so `*` doesn't expose sessions.
 * - App pages: optimistic redirect to sign-in when there's no session cookie. Pages still verify the session;
 *   this only saves a render for signed-out visitors.
 */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (pathname.startsWith('/api/v1/')) {
		if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
		const response = NextResponse.next();
		for (const [key, value] of Object.entries(CORS_HEADERS)) response.headers.set(key, value);
		return response;
	}

	if (APP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) && !getSessionCookie(request)) {
		const url = new URL('/login', request.url);
		url.searchParams.set('next', pathname);
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/api/v1/:path*', '/dashboard/:path*', '/projects/:path*', '/settings/:path*'],
};
