import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	{
		name: 'wakacraft',
		rules: {
			// `const { secret: _secret, ...rest } = doc` is how fields are dropped from responses.
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
			],
			'no-restricted-syntax': [
				'error',
				{ selector: "Property[key.name='_id']", message: 'Use the snowflake `id`, not `_id`.' },
				{ selector: "MemberExpression[property.name='_id']", message: 'Use the snowflake `id`, not `_id`.' },
			],
		},
	},
	{
		// Ported as-is from the reference backend, which types Mongoose internals loosely.
		name: 'mongo-internals',
		files: ['src/lib/mongo/**/*.ts', 'src/lib/scripts/**/*.ts'],
		rules: { '@typescript-eslint/no-explicit-any': 'off' },
	},
	globalIgnores([
		'.next/**',
		'out/**',
		'build/**',
		'.data/**',
		'next-env.d.ts',
		'src/lib/mongo/zod/**',
		'extensions/**',
	]),
]);

export default eslintConfig;
