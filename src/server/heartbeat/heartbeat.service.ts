import { createHash } from 'node:crypto';

import { z } from 'zod';

import { NotFoundException } from '@/lib/http/errors';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { localDayBounds } from '@/lib/util/Time';
import { applyRules } from '@/server/custom-rule/custom-rule.matcher';
import { customRuleService } from '@/server/custom-rule/custom-rule.service';
import { machineService } from '@/server/machine/machine.service';
import { projectService } from '@/server/project/project.service';
import { invalidateRollups } from '@/server/stats/rollup-invalidation';
import { userAgentService } from '@/server/user-agent/user-agent.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { HeartbeatRequestSchema, ImportedHeartbeatSchema, type HeartbeatInput } from './heartbeat.request.dto';
import { toHeartbeatResponse, type HeartbeatResponse } from './heartbeat.response.dto';

import type { IHeartbeatZodSchema } from '@/lib/mongo/zod';

export interface IngestContext {
	/** `User-Agent` header; a heartbeat's own `user_agent` field takes precedence. */
	userAgent: string | null;
	/** `X-Machine-Name` header; a heartbeat's own `machine_name` takes precedence. */
	machineName: string | null;
	/** Importing history: heartbeats older than the live-traffic age limit are accepted. */
	historical?: boolean;
}

/** One element of the bulk response: `[body, status]`, exactly as wakatime-cli parses it. */
export type IngestResult =
	| [{ data: Pick<IHeartbeatZodSchema, 'id' | 'entity' | 'type' | 'time'> }, 201]
	| [{ error: string; errors?: Record<string, string[]> }, 400];

/**
 * Identifies a heartbeat across resends. An imported WakaTime heartbeat is identified by its WakaTime id alone: an
 * export file carries no user agent or machine lists while the API does, so the same heartbeat from the two sources
 * differs in exactly the fields the content hash covers.
 */
const dedupHash = (userId: string, heartbeat: HeartbeatInput, machine: string | null, userAgent: string | null) =>
	createHash('sha1')
		.update(
			JSON.stringify(
				heartbeat.sourceId
					? [userId, 'wakatime', heartbeat.sourceId]
					: [
							userId,
							heartbeat.time,
							heartbeat.entity,
							heartbeat.type,
							heartbeat.category,
							heartbeat.project ?? null,
							heartbeat.branch ?? null,
							heartbeat.language ?? null,
							heartbeat.isWrite,
							heartbeat.lineno ?? null,
							heartbeat.cursorpos ?? null,
							heartbeat.lines ?? null,
							heartbeat.aiLineChanges ?? null,
							heartbeat.humanLineChanges ?? null,
							machine,
							userAgent,
						],
			),
		)
		.digest('hex');

class HeartbeatService {
	/**
	 * Validates each raw heartbeat independently, stores the valid ones (skipping offline-queue resends), and
	 * returns one `[body, status]` pair per input in input order.
	 */
	public async ingest(userId: string, rawHeartbeats: unknown[], context: IngestContext): Promise<IngestResult[]> {
		const results: (IngestResult | null)[] = rawHeartbeats.map(() => null);
		const valid: { index: number; heartbeat: HeartbeatInput }[] = [];

		const schema = context.historical ? ImportedHeartbeatSchema : HeartbeatRequestSchema;
		rawHeartbeats.forEach((raw, index) => {
			const parsed = schema.safeParse(raw);
			if (parsed.success) valid.push({ index, heartbeat: parsed.data });
			else {
				const { fieldErrors } = z.flattenError(parsed.error);
				results[index] = [
					{
						error: parsed.error.issues[0]?.message ?? 'Invalid heartbeat',
						errors: Object.fromEntries(
							Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])),
						),
					},
					400,
				];
			}
		});

		if (valid.length) {
			const headerMachine = context.machineName?.trim().slice(0, 256) || null;
			const machineOf = (heartbeat: HeartbeatInput) => heartbeat.machineName ?? headerMachine;
			const [machines, userAgents, rules] = await Promise.all([
				machineService.touchMany(
					userId,
					valid.map(({ heartbeat }) => machineOf(heartbeat)),
				),
				userAgentService.touchMany(
					userId,
					valid.map(({ heartbeat }) => heartbeat.userAgent ?? context.userAgent),
				),
				customRuleService.rulesFor(userId),
			]);

			// Custom rules run on the enriched heartbeat (they can match editor/OS/machine). The dedup hash stays on the
			// original, so an offline-queue resend still collides after a rule renamed its project.
			const docs = valid.map(({ heartbeat }) => {
				const userAgentValue = heartbeat.userAgent ?? context.userAgent;
				const userAgent = userAgentValue ? userAgents.get(userAgentValue) : undefined;
				const machine = machineOf(heartbeat);
				const { userAgent: _userAgent, machineName: _machineName, sourceId: _sourceId, ...fields } = heartbeat;
				const enriched = {
					...fields,
					userId,
					userAgentId: userAgent?.id,
					editor: userAgent?.editor ?? undefined,
					operatingSystem: userAgent?.os ?? undefined,
					machine: machine ? machines.get(machine)?.name : undefined,
					dedupHash: dedupHash(userId, heartbeat, machine, userAgentValue),
				};
				return rules.length ? applyRules(enriched, rules) : enriched;
			});

			const kept = docs.filter((doc): doc is NonNullable<typeof doc> => doc !== null);
			const { inserted } = await mongoHeartbeatService.insertManyIgnoringDuplicates(kept);
			const insertedByHash = new Map(
				inserted.flatMap((heartbeat, position) =>
					heartbeat ? [[kept[position].dedupHash, heartbeat.id] as const] : [],
				),
			);
			const existingIds = await this.idsForDuplicates(
				userId,
				kept.filter((doc) => !insertedByHash.has(doc.dedupHash)).map((doc) => doc.dedupHash),
			);

			valid.forEach(({ index, heartbeat }, position) => {
				const doc = docs[position];
				// A heartbeat dropped by a delete rule is still acknowledged, so the plugin doesn't retry it forever.
				const id = doc ? (insertedByHash.get(doc.dedupHash) ?? existingIds.get(doc.dedupHash) ?? '') : '';
				results[index] = [{ data: { id, entity: heartbeat.entity, type: heartbeat.type, time: heartbeat.time } }, 201];
			});

			const stored = inserted.filter((heartbeat): heartbeat is IHeartbeatZodSchema => heartbeat !== null);
			if (stored.length) await this.afterInsert(userId, stored);
		}

		return results as IngestResult[];
	}

	public async listForDate(userId: string, date: string, timezone: string): Promise<HeartbeatResponse[]> {
		const { start, end } = localDayBounds(date, timezone);
		const heartbeats = await mongoHeartbeatService.findInRange(userId, start, end);
		return heartbeats.map(toHeartbeatResponse);
	}

	public async deleteForDate(userId: string, date: string, timezone: string, ids: string[]): Promise<void> {
		const { start, end } = localDayBounds(date, timezone);
		const { deletedCount } = await mongoHeartbeatService.deleteMany({
			userId,
			id: { $in: ids },
			time: { $gte: start, $lt: end },
		});
		if (!deletedCount) throw new NotFoundException('No matching heartbeats on that date');
		await invalidateRollups(userId, [{ from: start, until: end - 1 }]);
	}

	private async idsForDuplicates(userId: string, hashes: string[]): Promise<Map<string, string>> {
		if (!hashes.length) return new Map();
		const existing = (await mongoHeartbeatService.find({ userId, dedupHash: { $in: hashes } }, 'id +dedupHash')) as {
			id: string;
			dedupHash: string;
		}[];
		return new Map(existing.map((heartbeat) => [heartbeat.dedupHash, heartbeat.id]));
	}

	private async afterInsert(userId: string, stored: IHeartbeatZodSchema[]): Promise<void> {
		const latest = stored.reduce((a, b) => (b.time > a.time ? b : a));

		await Promise.all([
			projectService.touchFromHeartbeats(userId, stored),
			invalidateRollups(
				userId,
				stored.map((heartbeat) => ({ from: heartbeat.time })),
			),
			userProfileService.recordActivity(userId, {
				lastHeartbeatAt: new Date(latest.time * 1000),
				lastPlugin: latest.editor ?? undefined,
				lastProject: latest.project ?? undefined,
				lastBranch: latest.branch ?? undefined,
			}),
		]);
	}
}

export const heartbeatService = new HeartbeatService();
