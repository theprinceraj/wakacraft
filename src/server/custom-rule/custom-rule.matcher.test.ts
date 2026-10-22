import { describe, expect, it } from 'vitest';

import { applyRules, matches, ruleFilter, ruleUpdate, type Rule } from './custom-rule.matcher';

const change = (
	overrides: Partial<Rule> & Pick<Rule, 'source' | 'operation' | 'sourceValue'>,
	destinations: Rule['destinations'],
): Rule => ({
	action: 'change',
	destinations,
	...overrides,
});

const dest = (destination: Rule['destinations'][number]['destination'], destinationValue: string) => ({
	id: '1',
	destination,
	destinationValue,
});

describe('matches', () => {
	it('compares equals exactly', () => {
		expect(matches('api', 'equals', 'api')).toBe(true);
		expect(matches('API', 'equals', 'api')).toBe(false);
	});

	it('matches substrings case-insensitively', () => {
		expect(matches('/Users/me/Work/API/server.ts', 'contains', '/work/api/')).toBe(true);
		expect(matches('feature/login', 'starts with', 'FEATURE/')).toBe(true);
		expect(matches('styles.SCSS', 'ends with', '.scss')).toBe(true);
		expect(matches('main', 'ends with', '.scss')).toBe(false);
	});

	it('never matches a missing value', () => {
		expect(matches(undefined, 'contains', 'x')).toBe(false);
		expect(matches(null, 'equals', '')).toBe(false);
	});
});

describe('applyRules', () => {
	const heartbeat = { entity: '/work/acme-web/src/app.tsx', project: 'acme-web-old', language: 'TSX', branch: 'main' };

	it('rewrites matching fields and leaves the original untouched', () => {
		const result = applyRules(heartbeat, [
			change({ source: 'project', operation: 'ends with', sourceValue: '-old' }, [dest('project', 'acme-web')]),
		]);
		expect(result).toEqual({ ...heartbeat, project: 'acme-web' });
		expect(heartbeat.project).toBe('acme-web-old');
	});

	it('chains rules in order, each seeing earlier changes', () => {
		const result = applyRules(heartbeat, [
			change({ source: 'project', operation: 'equals', sourceValue: 'acme-web-old' }, [dest('project', 'acme')]),
			change({ source: 'project', operation: 'equals', sourceValue: 'acme' }, [
				dest('language', 'TypeScript'),
				dest('branch', 'trunk'),
			]),
		]);
		expect(result).toMatchObject({ project: 'acme', language: 'TypeScript', branch: 'trunk' });
	});

	it('drops the heartbeat on a delete rule', () => {
		expect(
			applyRules(heartbeat, [
				{ action: 'delete', source: 'entity', operation: 'contains', sourceValue: '/src/', destinations: [] },
			]),
		).toBeNull();
	});

	it('maps operating_system to the stored field name', () => {
		const result = applyRules({ operatingSystem: 'Unknown OS' }, [
			change({ source: 'operating_system', operation: 'equals', sourceValue: 'Unknown OS' }, [
				dest('operating_system', 'Linux'),
			]),
		]);
		expect(result).toEqual({ operatingSystem: 'Linux' });
	});
});

describe('Mongo translation', () => {
	it('escapes regex metacharacters and anchors prefix/suffix matches', () => {
		expect(ruleFilter(change({ source: 'entity', operation: 'contains', sourceValue: 'a.b(c)' }, []))).toEqual({
			entity: { $regex: 'a\\.b\\(c\\)', $options: 'i' },
		});
		expect(ruleFilter(change({ source: 'branch', operation: 'starts with', sourceValue: 'feat/' }, []))).toEqual({
			branch: { $regex: '^feat/', $options: 'i' },
		});
		expect(ruleFilter(change({ source: 'project', operation: 'equals', sourceValue: 'x' }, []))).toEqual({
			project: 'x',
		});
	});

	it('builds the $set for every destination', () => {
		expect(
			ruleUpdate(
				change({ source: 'project', operation: 'equals', sourceValue: 'x' }, [
					dest('project', 'y'),
					dest('operating_system', 'Mac'),
				]),
			),
		).toEqual({
			project: 'y',
			operatingSystem: 'Mac',
		});
	});
});
