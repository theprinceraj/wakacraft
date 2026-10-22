import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth/auth';
import { connectMongo } from '@/lib/mongo/connection';
import { AuthorizeQuerySchema } from '@/server/oauth/oauth.request.dto';
import { OAuthError, oauthService } from '@/server/oauth/oauth.service';

/**
 * The consent form's target. Same-origin only: the session cookie is SameSite=Lax, and the Origin check stops any
 * other site from approving on a signed-in user's behalf.
 */
export async function POST(request: NextRequest) {
	const origin = request.headers.get('origin');
	if (origin && origin !== request.nextUrl.origin) {
		return NextResponse.json({ error: 'Cross-site request refused' }, { status: 403 });
	}

	await connectMongo();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return NextResponse.redirect(new URL('/login', request.url), 303);

	const form = await request.formData();
	const fields = Object.fromEntries(
		[...form.entries()].flatMap(([key, value]) => (typeof value === 'string' ? [[key, value]] : [])),
	);
	const parsed = AuthorizeQuerySchema.safeParse(fields);
	if (!parsed.success) return NextResponse.json({ error: 'Malformed authorization request' }, { status: 400 });

	try {
		const target =
			fields.decision === 'approve'
				? await oauthService.approve(session.user.id, parsed.data)
				: await oauthService.deny(parsed.data);
		return NextResponse.redirect(target, 303);
	} catch (error) {
		// Unknown client or unregistered redirect URI: never redirect there.
		if (error instanceof OAuthError) return NextResponse.json({ error: error.message }, { status: 400 });
		throw error;
	}
}
