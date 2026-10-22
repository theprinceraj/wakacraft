import { inBackground } from '@/lib/http/background';
import { BadRequestException } from '@/lib/http/errors';
import { mongoWakatimeImportService } from '@/lib/mongo/wakatime-import/wakatime-import.service';
import { decryptSecret, encryptSecret } from '@/lib/util/Secrets';
import { addDays, eachDate, todayIn } from '@/lib/util/Time';
import { WakatimeImportStatuses } from '@/lib/util/WakatimeImports';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { buildLookups, toWireHeartbeat } from '@/server/import/import.mapper';

import { WakatimeApiError, wakatimeClient } from './wakatime.client';

import type { IWakatimeImportZodSchema } from '@/lib/mongo/zod';

const SECRET_PURPOSE = 'wakatime-import';
/** Longer than one day's fetch + ingest; a holder that dies frees the job after this. */
const LEASE_MS = 120_000;
/** Work per invocation, kept well under the route's `maxDuration`; the next poll or the cron continues. */
const BUDGET_MS = 45_000;
const INGEST_CHUNK = 1000;
/** When WakaTime fails without saying how long to wait. */
const DEFAULT_RETRY_SECONDS = 60;

const lookupList = (items: unknown[]) =>
	items.flatMap((item) => {
		if (typeof item !== 'object' || item === null) return [];
		const { id, value, name } = item as Record<string, unknown>;
		const text = typeof value === 'string' && value ? value : typeof name === 'string' && name ? name : null;
		return typeof id === 'string' && text ? [{ id, value: text }] : [];
	});

function toResponse(job: IWakatimeImportZodSchema) {
	return {
		id: job.id,
		status: job.status,
		start_date: job.startDate,
		end_date: job.endDate,
		cursor: job.cursor,
		days_done: job.daysDone,
		days_total: job.daysTotal,
		percent: job.daysTotal ? Math.round((job.daysDone / job.daysTotal) * 100) : 100,
		heartbeats_imported: job.heartbeatsImported,
		waiting_until: job.retryAt?.toISOString() ?? null,
		error: job.error ?? null,
		created_at: job.createdAt.toISOString(),
		finished_at: job.finishedAt?.toISOString() ?? null,
	};
}

export type WakatimeImportResponse = ReturnType<typeof toResponse>;

class WakatimeImportService {
	/** Checks the key against WakaTime, records what to fetch, and starts working in the background. */
	public async start(userId: string, apiKey: string) {
		if (await mongoWakatimeImportService.exists({ userId, status: WakatimeImportStatuses.Running })) {
			throw new BadRequestException('An import from WakaTime is already running');
		}

		let range: { start: string; end: string } | null;
		let userAgents: unknown[];
		let machines: unknown[];
		try {
			range = await wakatimeClient.activityRange(apiKey);
			[userAgents, machines] = await Promise.all([wakatimeClient.userAgents(apiKey), wakatimeClient.machines(apiKey)]);
		} catch (error) {
			if (error instanceof WakatimeApiError && (error.status === 401 || error.status === 403)) {
				throw new BadRequestException('WakaTime rejected that API key');
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Could not reach WakaTime');
		}
		if (!range) {
			throw new BadRequestException('WakaTime is still calculating your totals — try again in a few minutes');
		}

		// WakaTime's dates are in your WakaTime timezone; one extra day covers anyone ahead of UTC.
		const end = [range.end, addDays(todayIn('UTC'), 1)].sort()[0];
		const job = await mongoWakatimeImportService.create({
			userId,
			status: WakatimeImportStatuses.Running,
			apiKey: encryptSecret(apiKey, SECRET_PURPOSE),
			startDate: range.start,
			endDate: end,
			cursor: range.start,
			daysTotal: range.start <= end ? eachDate(range.start, end).length : 0,
			userAgents: lookupList(userAgents),
			machines: lookupList(machines),
		});
		inBackground(() => this.pump(job.id));
		return { data: toResponse(job) };
	}

	/** The latest import, resuming it if it's running and nobody is working on it. */
	public async getStatus(userId: string) {
		const [job] = await mongoWakatimeImportService.find({ userId }, '', { sort: { createdAt: -1 }, limit: 1 });
		if (!job) return { data: null };
		if (job.status === WakatimeImportStatuses.Running) inBackground(() => this.pump(job.id));
		return { data: toResponse(job) };
	}

	public async cancel(userId: string) {
		const job = await mongoWakatimeImportService.updateOne(
			{ userId, status: WakatimeImportStatuses.Running },
			{ $set: { status: WakatimeImportStatuses.Cancelled, finishedAt: new Date() }, $unset: { apiKey: 1 } },
		);
		if (!job) throw new BadRequestException('No import is running');
		return { data: toResponse(job) };
	}

	/** For the cron: continue a few running imports nobody is polling (each costs up to the time budget). */
	public async resumeStalled(limit = 4) {
		const jobs = await mongoWakatimeImportService.find(
			{
				status: WakatimeImportStatuses.Running,
				$or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lt: new Date() } }],
			},
			['id'],
			{ limit },
		);
		for (const { id } of jobs) await this.pump(id);
		return jobs.length;
	}

	/**
	 * Advances a job day by day until it finishes, the time budget runs out, WakaTime asks us to wait, or the job is
	 * cancelled. Safe to call any time: without the lease it does nothing.
	 */
	public async pump(jobId: string): Promise<void> {
		const job = await mongoWakatimeImportService.acquireLease(jobId, LEASE_MS);
		if (!job?.apiKey) return;

		const apiKey = decryptSecret(job.apiKey, SECRET_PURPOSE);
		const lookups = buildLookups(job.userAgents, job.machines);
		const deadline = Date.now() + BUDGET_MS;
		let cursor = job.cursor;

		while (cursor <= job.endDate && Date.now() < deadline) {
			let heartbeats: unknown[];
			try {
				heartbeats = await wakatimeClient.heartbeats(apiKey, cursor);
			} catch (error) {
				await this.handleFetchError(job, error);
				return;
			}

			let imported = 0;
			for (let index = 0; index < heartbeats.length; index += INGEST_CHUNK) {
				const results = await heartbeatService.ingest(
					job.userId,
					heartbeats.slice(index, index + INGEST_CHUNK).map((heartbeat) => toWireHeartbeat(heartbeat, lookups)),
					{ userAgent: null, machineName: null, historical: true },
				);
				imported += results.filter(([, status]) => status < 400).length;
			}

			cursor = addDays(cursor, 1);
			const progressed = await mongoWakatimeImportService.updateOne(
				{ id: job.id, status: WakatimeImportStatuses.Running },
				{
					$set: { cursor, leaseUntil: new Date(Date.now() + LEASE_MS) },
					$inc: { daysDone: 1, heartbeatsImported: imported },
				},
			);
			if (!progressed) return; // Cancelled meanwhile.
		}

		if (cursor > job.endDate) {
			await mongoWakatimeImportService.updateOne(
				{ id: job.id, status: WakatimeImportStatuses.Running },
				{
					$set: { status: WakatimeImportStatuses.Done, finishedAt: new Date() },
					$unset: { apiKey: 1, leaseUntil: 1 },
				},
			);
		} else {
			await mongoWakatimeImportService.updateOne({ id: job.id }, { $unset: { leaseUntil: 1 } });
		}
	}

	private async handleFetchError(job: IWakatimeImportZodSchema, error: unknown) {
		if (error instanceof WakatimeApiError && (error.status === 401 || error.status === 403)) {
			await mongoWakatimeImportService.updateOne(
				{ id: job.id, status: WakatimeImportStatuses.Running },
				{
					$set: {
						status: WakatimeImportStatuses.Failed,
						error: 'WakaTime no longer accepts the API key. Start the import again with a current key.',
						finishedAt: new Date(),
					},
					$unset: { apiKey: 1, leaseUntil: 1 },
				},
			);
			return;
		}
		// Rate limits and outages: wait, then pick up from the same day.
		const seconds =
			error instanceof WakatimeApiError ? (error.retryAfter ?? DEFAULT_RETRY_SECONDS) : DEFAULT_RETRY_SECONDS;
		await mongoWakatimeImportService.updateOne(
			{ id: job.id },
			{ $set: { retryAt: new Date(Date.now() + seconds * 1000) }, $unset: { leaseUntil: 1 } },
		);
	}
}

export const wakatimeImportService = new WakatimeImportService();
