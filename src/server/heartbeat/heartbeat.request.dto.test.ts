import { describe, expect, it } from 'vitest';

import { HeartbeatRequestSchema } from './heartbeat.request.dto';

const heartbeat = (overrides: Record<string, unknown>) => ({
	entity: '/code/api/notes.md',
	type: 'file',
	time: Date.now() / 1000,
	...overrides,
});

describe('HeartbeatRequestSchema', () => {
	// wakatime-cli emits these; rejecting them drops the heartbeat with a per-item 400.
	it('accepts every entity type wakatime-cli sends', () => {
		for (const type of ['file', 'domain', 'url', 'event', 'app']) {
			expect(HeartbeatRequestSchema.safeParse(heartbeat({ type })).success, type).toBe(true);
		}
	});

	it('accepts the notes category', () => {
		expect(HeartbeatRequestSchema.parse(heartbeat({ category: 'notes' })).category).toBe('notes');
	});

	it('defaults a missing category to coding, since wakatime-cli omits it when empty', () => {
		expect(HeartbeatRequestSchema.parse(heartbeat({})).category).toBe('coding');
	});
});
