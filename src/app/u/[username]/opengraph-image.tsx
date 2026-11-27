import { ImageResponse } from 'next/og';
import { connection } from 'next/server';

import { formatDuration } from '@/lib/format';
import { connectMongo } from '@/lib/mongo/connection';
import { PUBLIC_HOST } from '@/lib/public-origin';
import { publicProfileService } from '@/server/user/public-profile.service';

export const alt = 'Public coding activity on wakacraft';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Hex equivalents of the light theme tokens in globals.css (ImageResponse can't read CSS variables).
const CREAM = '#fefdf7';
const INK = '#131b34';
const MUTED = '#515869';
const EMBER = '#ea6300';

/**
 * Only what the card shows: the profile and its public 7-day stats, through the same privacy filters as the page
 * (no stats unless logged time is public, no languages unless they are). Null for a missing profile or any error.
 */
const loadStats = async (segment: string) => {
	try {
		const username = decodeURIComponent(segment);
		await Promise.all([connection(), connectMongo()]);
		const profile = await publicProfileService.getProfile(username);
		const stats = profile.loggedTimePublic
			? (await publicProfileService.getPublicStats(profile.userId, 'last_7_days', {})).data
			: null;
		return { name: profile.username ?? username, stats };
	} catch {
		return null;
	}
};

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
	const profile = await loadStats((await params).username);
	const stats = profile?.stats;
	const languages = stats?.is_language_usage_visible ? stats.languages.slice(0, 3) : [];

	return new ImageResponse(
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
			{profile ? (
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					<div style={{ display: 'flex', fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
						{`@${profile.name}`}
					</div>
					{stats ? (
						<div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
							<div style={{ display: 'flex', alignItems: 'baseline' }}>
								<div style={{ fontSize: 76, fontWeight: 700, color: EMBER }}>
									{formatDuration(stats.total_seconds_including_other_language)}
								</div>
								<div style={{ marginLeft: 20, fontSize: 32, color: MUTED }}>coded in the last 7 days</div>
							</div>
							{languages.length ? (
								<div style={{ display: 'flex', marginTop: 28, fontSize: 32, color: MUTED }}>
									{languages.map((language) => language.name).join('  ·  ')}
								</div>
							) : null}
						</div>
					) : (
						<div style={{ marginTop: 32, fontSize: 36, color: MUTED }}>Public coding activity on wakacraft</div>
					)}
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					<div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
						Open-source WakaTime alternative.
					</div>
					<div style={{ marginTop: 24, fontSize: 38, color: MUTED }}>Every feature free.</div>
				</div>
			)}
			<div style={{ display: 'flex', fontSize: 28, color: MUTED }}>{PUBLIC_HOST}</div>
		</div>,
		{
			...size,
			// Crawlers refetch cards often; let the CDN serve one for 10 minutes and refresh it in the background.
			headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' },
		},
	);
}
