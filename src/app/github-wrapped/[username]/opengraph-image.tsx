import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';
import { connection } from 'next/server';

import { clientIp } from '@/lib/http/client-ip';
import { connectMongo } from '@/lib/mongo/connection';
import { PUBLIC_HOST } from '@/lib/public-origin';
import { GithubLoginSchema } from '@/server/github-wrapped/github-wrapped.request.dto';
import { githubWrappedService } from '@/server/github-wrapped/github-wrapped.service';

import type { GithubWrapped } from '@/server/github-wrapped/derive';

export const alt = 'A GitHub Wrapped on wakacraft';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Hex equivalents of the light theme tokens in globals.css (ImageResponse can't read CSS variables).
const CREAM = '#fefdf7';
const INK = '#131b34';
const MUTED = '#515869';
const EMBER = '#ea6300';
const ON_INK_EMBER = '#ff9a3d';

/** The current year's wrapped, or null for a missing user or any error, so the card always renders. */
const load = async (segment: string): Promise<GithubWrapped | null> => {
	try {
		const parsed = GithubLoginSchema.safeParse(decodeURIComponent(segment));
		if (!parsed.success) return null;
		await Promise.all([connection(), connectMongo()]);
		// Counted like the page: an uncached card spends GitHub quota just the same.
		await githubWrappedService.consumeRateLimit(clientIp(await headers()));
		const result = await githubWrappedService.get(parsed.data);
		return result.status === 'ok' ? result.wrapped : null;
	} catch {
		return null;
	}
};

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
	const w = await load((await params).username);

	return new ImageResponse(
		w ? (
			<div style={{ width: '100%', height: '100%', display: 'flex', background: CREAM, color: INK, padding: 48 }}>
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						background: INK,
						color: CREAM,
						borderRadius: 40,
						padding: 56,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<div style={{ display: 'flex', alignItems: 'center' }}>
							{/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
							<img src={w.avatarUrl} width={72} height={72} style={{ borderRadius: 36 }} alt="" />
							<div style={{ display: 'flex', flexDirection: 'column', marginLeft: 22 }}>
								<div style={{ fontSize: 34, fontWeight: 700 }}>{`@${w.login}`}</div>
								<div style={{ fontSize: 24, color: '#a9aec0' }}>{`GitHub Wrapped ${w.year}`}</div>
							</div>
						</div>
						<div
							style={{
								display: 'flex',
								background: EMBER,
								color: '#ffffff',
								fontSize: 28,
								fontWeight: 700,
								padding: '12px 26px',
								borderRadius: 999,
							}}
						>
							{w.archetype.title}
						</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
						<div style={{ display: 'flex', flexDirection: 'column' }}>
							<div style={{ fontSize: 150, fontWeight: 700, letterSpacing: -6, lineHeight: 1, color: ON_INK_EMBER }}>
								{w.total.toLocaleString('en-US')}
							</div>
							<div style={{ fontSize: 34, color: '#d6d8e0', marginTop: 8 }}>contributions</div>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 30 }}>
							<div style={{ display: 'flex' }}>{`${w.longestStreak?.days ?? 0}-day streak`}</div>
							<div style={{ display: 'flex', marginTop: 10 }}>{`${w.activeDays} active days`}</div>
							{w.languages[0] ? (
								<div style={{ display: 'flex', marginTop: 10 }}>{`Mostly ${w.languages[0].name}`}</div>
							) : null}
							<div style={{ display: 'flex', marginTop: 26, fontSize: 24, color: '#a9aec0' }}>
								{`${PUBLIC_HOST}/github-wrapped`}
							</div>
						</div>
					</div>
				</div>
			</div>
		) : (
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					background: CREAM,
					color: INK,
					padding: 72,
				}}
			>
				<div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
					wakacraft<span style={{ color: EMBER }}>.</span>
				</div>
				<div style={{ display: 'flex', fontSize: 92, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
					Your year on GitHub, wrapped<span style={{ color: EMBER }}>.</span>
				</div>
				<div style={{ display: 'flex', fontSize: 30, color: MUTED }}>{`${PUBLIC_HOST}/github-wrapped`}</div>
			</div>
		),
		{
			...size,
			// Only a real card is cached: a fallback from a rate limit or GitHub blip must not stick in link previews.
			headers: {
				'Cache-Control': w ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'no-store',
			},
		},
	);
}
