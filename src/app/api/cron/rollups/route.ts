import { timingSafeEqual } from 'node:crypto';

import { UnauthorizedException } from '@/lib/http/errors';
import { route } from '@/lib/http/route';
import { prebuildService } from '@/server/stats/prebuild.service';

export const maxDuration = 300;

const authorized = (header: string | null) => {
	const secret = process.env.CRON_SECRET;
	if (!secret || !header) return false;
	const expected = Buffer.from(`Bearer ${secret}`);
	const actual = Buffer.from(header);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
};

/** Vercel Cron (see vercel.json) calls this nightly with `Authorization: Bearer $CRON_SECRET`. */
export const GET = route({ auth: 'none' }, async ({ request }) => {
	if (!authorized(request.headers.get('authorization'))) throw new UnauthorizedException();
	return { data: await prebuildService.prebuildYesterday() };
});
