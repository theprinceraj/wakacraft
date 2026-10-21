import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		globalSetup: ['./src/test/mongo.global-setup.ts'],
		testTimeout: 30_000,
		hookTimeout: 120_000,
	},
});
