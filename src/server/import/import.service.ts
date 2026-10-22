import { heartbeatService } from '@/server/heartbeat/heartbeat.service';

import { buildLookups, toWireHeartbeat } from './import.mapper';

import type { z } from 'zod';
import type { ImportBatchSchema } from './import.request.dto';

class ImportService {
	/**
	 * Ingests one batch of exported heartbeats through the normal pipeline (custom rules, projects, rollup
	 * invalidation), without the live-traffic age limit. Dedup makes re-running an import harmless.
	 */
	public async importBatch(userId: string, batch: z.output<typeof ImportBatchSchema>) {
		const lookups = buildLookups(batch.user_agents, batch.machines);
		const results = await heartbeatService.ingest(
			userId,
			batch.heartbeats.map((heartbeat) => toWireHeartbeat(heartbeat, lookups)),
			{ userAgent: null, machineName: null, historical: true },
		);

		const invalid = results.filter(([, status]) => status === 400);
		const firstError = invalid[0]?.[0];
		return {
			data: {
				received: results.length,
				accepted: results.length - invalid.length,
				invalid: invalid.length,
				...(firstError && 'error' in firstError ? { first_error: firstError.error } : {}),
			},
		};
	}
}

export const importService = new ImportService();
