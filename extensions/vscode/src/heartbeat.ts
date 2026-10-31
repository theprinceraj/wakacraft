/** Same cadence as WakaTime plugins: a new file, a save, or two minutes on the same file triggers a heartbeat. */
export const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

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

/**
 * Decides which editor events become heartbeats and keeps at most one wakatime-cli process running: events that
 * arrive while one is in flight collapse into a single pending heartbeat (the latest, remembering any save).
 */
export class HeartbeatQueue {
	private lastEntity = '';
	private lastSentAt = 0;
	private inFlight = false;
	private pending: Heartbeat | null = null;

	constructor(private readonly send: (heartbeat: Heartbeat) => Promise<void>) {}

	push(heartbeat: Heartbeat, now = Date.now()): void {
		const due =
			heartbeat.isWrite || heartbeat.entity !== this.lastEntity || now - this.lastSentAt >= HEARTBEAT_INTERVAL_MS;
		if (!due) return;

		this.lastEntity = heartbeat.entity;
		this.lastSentAt = now;

		if (this.inFlight) {
			const isWrite = heartbeat.isWrite || (this.pending?.entity === heartbeat.entity && this.pending.isWrite);
			this.pending = { ...heartbeat, isWrite };
			return;
		}
		void this.run(heartbeat);
	}

	private async run(heartbeat: Heartbeat): Promise<void> {
		this.inFlight = true;
		try {
			await this.send(heartbeat);
		} catch {
			// send() reports its own failures; a broken heartbeat must not wedge the queue.
		} finally {
			this.inFlight = false;
			const next = this.pending;
			this.pending = null;
			if (next) void this.run(next);
		}
	}
}
