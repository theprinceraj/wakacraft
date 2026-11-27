import { connection } from 'next/server';

import type { MetadataRoute } from 'next';

import { PUBLIC_ORIGIN } from '@/lib/public-origin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Per request, so a DEMO_USERNAME set at runtime is listed.
	await connection();
	const demo = process.env.DEMO_USERNAME?.trim().toLowerCase();
	const paths = ['/', '/login', '/privacy', '/terms', ...(demo ? [`/@${encodeURIComponent(demo)}`] : [])];
	return paths.map((path) => ({ url: `${PUBLIC_ORIGIN}${path}` }));
}
