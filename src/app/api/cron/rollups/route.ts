import { timingSafeEqual } from 'node:crypto';

import { UnauthorizedException } from '@/lib/http/errors';
import { route } from '@/lib/http/route';
import { demoService } from '@/server/demo/demo.service';
import { prebuildService } from '@/server/stats/prebuild.service';
import { wakatimeImportService } from '@/server/wakatime-import/wakatime-import.service';

export const maxDuration = 300;

const authorized = (header: string | null) => {
	const secret = process.env.CRON_SECRET;
	if (!secret || !header) return false;
	const expected = Buffer.from(`Bearer ${secret}`);
	const actual = Buffer.from(header);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
};

/**
 * Vercel Cron (see vercel.json) calls this nightly with `Authorization: Bearer $CRON_SECRET`: pre-builds yesterday's
 * rollups and continues WakaTime imports nobody is watching. When DEMO_USERNAME is set, first tops up that demo account
 * with the last few days of synthetic heartbeats.
 */
export const GET = route({ auth: 'none' }, async ({ request }) => {
	if (!authorized(request.headers.get('authorization'))) throw new UnauthorizedException();
	// Before the prebuild, so the demo's new day is rolled up with everyone else's. A demo failure must not cost
	// real users their rollups or stalled imports, so it is only logged.
	const demoHeartbeats = await demoService.refresh(process.env.DEMO_USERNAME).catch((error: unknown) => {
		console.error('[cron] demo top-up failed', error);
		return 0;
	});
	const { users } = await prebuildService.prebuildYesterday();
	return {
		data: { users, imports_resumed: await wakatimeImportService.resumeStalled(), demo_heartbeats: demoHeartbeats },
	};
});
