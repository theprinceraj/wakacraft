import type { MetadataRoute } from 'next';

import { PUBLIC_ORIGIN } from '@/lib/public-origin';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			disallow: [
				'/api/',
				'/oauth',
				'/dashboard',
				'/settings',
				'/projects',
				'/goals',
				'/insights',
				'/invoices',
				'/leaderboards',
				'/orgs',
				'/wrapped',
				'/welcome',
				'/signup',
			],
		},
		sitemap: `${PUBLIC_ORIGIN}/sitemap.xml`,
	};
}
