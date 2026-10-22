import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	cacheComponents: true,
	// Public profiles live at /@username like WakaTime's; `@` folders are reserved for parallel routes, so rewrite.
	async rewrites() {
		return [{ source: '/@:username', destination: '/u/:username' }];
	},
	partialPrefetching: true,
	turbopack: {
		rules: {
			'*.css': {
				loaders: ['@tailwindcss/turbopack'],
				as: '*.css',
			},
		},
	},
};

export default nextConfig;
