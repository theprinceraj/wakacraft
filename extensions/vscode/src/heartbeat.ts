/** Same cadence as WakaTime plugins: a new file, a save, or two minutes on the same file triggers a heartbeat. */
export const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;
/** Heartbeats waiting while a cli run is in flight; beyond this the oldest are dropped. */
export const MAX_PENDING = 100;

export interface Heartbeat {
	entity: string;
	time: number;
	isWrite: boolean;
	lineno?: number;
	cursorpos?: number;
	lines?: number;
	projectFolder?: string;
	category?: 'coding' | 'debugging' | 'building';
}

export interface Connection {
	apiUrl: string;
	plugin: string;
}

export function heartbeatArgs(heartbeat: Heartbeat, connection: Connection): string[] {
	const args = [
		'--entity',
		heartbeat.entity,
		'--time',
		heartbeat.time.toFixed(3),
		'--plugin',
		connection.plugin,
		'--api-url',
		connection.apiUrl,
	];
	if (heartbeat.isWrite) args.push('--write');
	// 1-based, like every WakaTime plugin; WakaTime rejects a cursorpos of 0.
	if (heartbeat.lineno) args.push('--lineno', String(heartbeat.lineno));
	if (heartbeat.cursorpos) args.push('--cursorpos', String(heartbeat.cursorpos));
	if (heartbeat.lines !== undefined) args.push('--lines-in-file', String(heartbeat.lines));
	if (heartbeat.projectFolder) args.push('--project-folder', heartbeat.projectFolder);
	if (heartbeat.category && heartbeat.category !== 'coding') args.push('--category', heartbeat.category);
	return args;
}

/** One heartbeat in wakatime-cli's `--extra-heartbeats` stdin format (`pkg/params` `ExtraHeartbeat`). */
export function extraHeartbeat(heartbeat: Heartbeat): Record<string, unknown> {
	return {
		entity: heartbeat.entity,
		entity_type: 'file',
		time: heartbeat.time,
		is_write: heartbeat.isWrite,
		...(heartbeat.lineno ? { lineno: heartbeat.lineno } : {}),
		...(heartbeat.cursorpos ? { cursorpos: heartbeat.cursorpos } : {}),
		...(heartbeat.lines !== undefined ? { lines: heartbeat.lines } : {}),
		...(heartbeat.category && heartbeat.category !== 'coding' ? { category: heartbeat.category } : {}),
	};
}

/**
 * Decides which editor events become heartbeats and keeps at most one wakatime-cli process running. Heartbeats that
 * come due while a run is in flight wait, in order, and go out together in the next run, so a save is never dropped.
 */
export class HeartbeatQueue {
	private lastEntity = '';
	private lastSentAt = 0;
	private inFlight = false;
	private pending: Heartbeat[] = [];

	constructor(private readonly send: (heartbeats: Heartbeat[]) => Promise<void>) {}

	push(heartbeat: Heartbeat, now = Date.now()): void {
		const due =
			heartbeat.isWrite || heartbeat.entity !== this.lastEntity || now - this.lastSentAt >= HEARTBEAT_INTERVAL_MS;
		if (!due) return;

		this.lastEntity = heartbeat.entity;
		this.lastSentAt = now;
		this.pending.push(heartbeat);
		if (this.pending.length > MAX_PENDING) this.pending.splice(0, this.pending.length - MAX_PENDING);
		if (!this.inFlight) void this.run();
	}

	private async run(): Promise<void> {
		this.inFlight = true;
		while (this.pending.length) {
			const batch = this.pending;
			this.pending = [];
			try {
				await this.send(batch);
			} catch {
				// send() reports its own failures; a broken run must not wedge the queue.
			}
		}
		this.inFlight = false;
	}
}
