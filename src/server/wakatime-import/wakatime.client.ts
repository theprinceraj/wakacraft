/**
 * The few wakatime.com API calls an import needs. The base URL is fixed: the server fetches it with the user's key,
 * so letting users point it elsewhere would turn the import into a request-forgery tool.
 *
 * Authenticates with a personal OAuth token: from November 1, 2026 WakaTime only accepts secret API keys from editor
 * plugins and answers 403 to anything else.
 */
const WAKATIME_API = 'https://wakatime.com/api/v1';
const TIMEOUT_MS = 30_000;

export class WakatimeApiError extends Error {
	public constructor(
		public readonly status: number,
		message: string,
		/** Seconds WakaTime asked us to wait, from `Retry-After`. */
		public readonly retryAfter?: number,
	) {
		super(message);
		this.name = 'WakatimeApiError';
	}
}

type Json = Record<string, unknown>;

async function get(token: string, path: string): Promise<Json> {
	let response: Response;
	try {
		response = await fetch(`${WAKATIME_API}${path}`, {
			headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch (error) {
		throw new WakatimeApiError(0, `Could not reach WakaTime: ${(error as Error).message}`);
	}
	if (!response.ok) {
		const retryAfter = Number(response.headers.get('retry-after'));
		throw new WakatimeApiError(
			response.status,
			`WakaTime answered ${response.status}`,
			Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
		);
	}
	return (await response.json()) as Json;
}

const list = (json: Json) => (Array.isArray(json.data) ? (json.data as unknown[]) : []);

export const wakatimeClient = {
	/** First and last day with activity, from `all_time_since_today`. Null while WakaTime is still computing it. */
	async activityRange(token: string): Promise<{ start: string; end: string } | null> {
		const json = await get(token, '/users/current/all_time_since_today');
		const range = (json.data as Json | undefined)?.range as Json | undefined;
		const start = typeof range?.start_date === 'string' ? range.start_date.slice(0, 10) : null;
		const end = typeof range?.end_date === 'string' ? range.end_date.slice(0, 10) : null;
		return start && end ? { start, end } : null;
	},

	async userAgents(token: string): Promise<unknown[]> {
		return list(await get(token, '/users/current/user_agents'));
	},

	async machines(token: string): Promise<unknown[]> {
		const machines: unknown[] = [];
		for (let page = 1; page <= 20; page++) {
			const json = await get(token, `/users/current/machine_names?page=${page}`);
			machines.push(...list(json));
			if (typeof json.total_pages !== 'number' || page >= json.total_pages) break;
		}
		return machines;
	},

	async heartbeats(token: string, date: string): Promise<unknown[]> {
		return list(await get(token, `/users/current/heartbeats?date=${date}`));
	},
};
