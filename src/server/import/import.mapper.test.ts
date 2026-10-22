import { describe, expect, it } from 'vitest';

import { buildLookups, toWireHeartbeat } from './import.mapper';

const wakatimeHeartbeat = {
	id: 'hb-1',
	entity: '/home/me/api/server.go',
	type: 'file',
	category: null,
	time: 1_700_000_000.5,
	project: 'api',
	branch: null,
	language: 'Go',
	dependencies: ['net/http'],
	lines: 120,
	lineno: 4,
	cursorpos: null,
	is_write: true,
	user_agent_id: 'ua-1',
	machine_name_id: 'm-1',
	created_at: '2023-11-14T22:13:20Z',
};

describe('toWireHeartbeat', () => {
	it('resolves user agent and machine ids through the export lists', () => {
		const lookups = buildLookups(
			[{ id: 'ua-1', value: 'wakatime/v1 (linux-6-x86_64) go1 vscode/1.90.0 vscode-wakatime/24.0.0' }],
			[{ id: 'm-1', value: 'workstation' }],
		);
		expect(toWireHeartbeat(wakatimeHeartbeat, lookups)).toMatchObject({
			entity: '/home/me/api/server.go',
			time: 1_700_000_000.5,
			project: 'api',
			language: 'Go',
			is_write: true,
			user_agent: 'wakatime/v1 (linux-6-x86_64) go1 vscode/1.90.0 vscode-wakatime/24.0.0',
			machine_name: 'workstation',
		});
	});

	it('turns nulls into absent fields so defaults apply', () => {
		const wire = toWireHeartbeat(wakatimeHeartbeat, buildLookups([], [])) as Record<string, unknown>;
		expect(wire.category).toBeUndefined();
		expect(wire.branch).toBeUndefined();
		expect(wire.cursorpos).toBeUndefined();
	});

	it('uses machine_name_id as the name when the export has no machine list (wakacraft exports)', () => {
		const wire = toWireHeartbeat({ ...wakatimeHeartbeat, machine_name_id: 'macbook' }, buildLookups([], []));
		expect(wire).toMatchObject({ machine_name: 'macbook' });
	});

	it('resolves wakacraft exports, whose heartbeats reference machines by name', () => {
		const lookups = buildLookups([], [{ id: '106', name: 'laptop', value: 'laptop' }]);
		expect(toWireHeartbeat({ ...wakatimeHeartbeat, machine_name_id: 'laptop' }, lookups)).toMatchObject({
			machine_name: 'laptop',
		});
	});

	it('leaves an unresolvable machine id out rather than storing a meaningless id', () => {
		const wire = toWireHeartbeat(
			{ ...wakatimeHeartbeat, machine_name_id: 'm-404' },
			buildLookups([], [{ id: 'm-1', value: 'x' }]),
		);
		expect(wire).toMatchObject({ machine_name: undefined });
	});
});
