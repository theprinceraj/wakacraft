import { after } from 'next/server';

/**
 * Runs `task` after the response is sent (Vercel keeps the function alive for it, up to the route's
 * `maxDuration`). Outside a Next request — tests, scripts — `after` throws, so the task just starts immediately.
 */
export function inBackground(task: () => Promise<unknown>): void {
	const run = () => task().catch((error: unknown) => console.error('Background task failed', error));
	try {
		after(run);
	} catch {
		void run();
	}
}
