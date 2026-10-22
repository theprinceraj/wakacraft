import { z } from 'zod';

import { NotFoundException } from '@/lib/http/errors';
import { mongoExternalDurationService } from '@/lib/mongo/external-duration/external-duration.service';
import { isValidTimezone, localDayBounds } from '@/lib/util/Time';
import { projectService } from '@/server/project/project.service';
import { invalidateRollups } from '@/server/stats/rollup-invalidation';
import { statsService } from '@/server/stats/stats.service';

import { ExternalDurationRequestSchema } from './external-duration.request.dto';

import type { IExternalDurationZodSchema } from '@/lib/mongo/zod';

const toResponse = (duration: IExternalDurationZodSchema) => ({
	id: duration.id,
	external_id: duration.externalId,
	entity: duration.entity,
	type: duration.type,
	category: duration.category,
	start_time: duration.startTime,
	end_time: duration.endTime,
	project: duration.project ?? null,
	branch: duration.branch ?? null,
	language: duration.language ?? null,
	meta: duration.meta ?? null,
	provider: duration.provider ?? null,
	created_at: duration.createdAt.toISOString(),
});

type ItemResult =
	[{ data: ReturnType<typeof toResponse> }, 201] | [{ error: string; errors?: Record<string, string[]> }, 400];

class ExternalDurationService {
	/** Validates each item on its own; re-sending an `external_id` updates that duration instead of duplicating it. */
	public async upsertMany(userId: string, raw: unknown[]): Promise<ItemResult[]> {
		const results = await Promise.all(
			raw.map(async (item): Promise<ItemResult> => {
				const parsed = ExternalDurationRequestSchema.safeParse(item);
				if (!parsed.success) {
					const { fieldErrors } = z.flattenError(parsed.error);
					return [
						{
							error: parsed.error.issues[0]?.message ?? 'Invalid external duration',
							errors: Object.fromEntries(
								Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])),
							),
						},
						400,
					];
				}
				const { externalId, ...fields } = parsed.data;
				const previous = await mongoExternalDurationService.findOne({ userId, externalId }, ['startTime', 'endTime']);
				const saved = await mongoExternalDurationService.updateOne(
					{ userId, externalId },
					{ $set: fields, $setOnInsert: { userId, externalId } },
					{ upsert: true, setDefaultsOnInsert: true },
				);
				// Both the old and the new span change totals.
				await invalidateRollups(userId, [
					{ from: fields.startTime, until: fields.endTime },
					...(previous ? [{ from: previous.startTime, until: previous.endTime }] : []),
				]);
				if (fields.project) {
					await projectService.touchFromHeartbeats(userId, [
						{ project: fields.project, time: fields.startTime },
						{ project: fields.project, time: fields.endTime },
					]);
				}
				return [{ data: toResponse(saved!) }, 201];
			}),
		);
		return results;
	}

	/** External durations overlapping a local day (in the user's timezone unless one is given). */
	public async listForDate(
		userId: string,
		query: { date: string; project?: string; branches?: string[]; timezone?: string },
	) {
		const settings = await statsService.resolveSettings(userId);
		const timezone = query.timezone && isValidTimezone(query.timezone) ? query.timezone : settings.timezone;
		const { start, end } = localDayBounds(query.date, timezone);
		const durations = await mongoExternalDurationService.findOverlapping(userId, start, end, {
			...(query.project ? { project: query.project } : {}),
			...(query.branches?.length ? { branch: { $in: query.branches } } : {}),
		});
		return { data: durations.map(toResponse), timezone };
	}

	public async deleteForDate(userId: string, date: string, ids: string[]) {
		const { timezone } = await statsService.resolveSettings(userId);
		const { start, end } = localDayBounds(date, timezone);
		const filter = { userId, id: { $in: ids }, startTime: { $lt: end }, endTime: { $gt: start } };
		const doomed = await mongoExternalDurationService.find(filter, ['startTime', 'endTime']);
		if (!doomed.length) throw new NotFoundException('No matching external durations on that date');
		await mongoExternalDurationService.deleteMany(filter);
		await invalidateRollups(
			userId,
			doomed.map((duration) => ({ from: duration.startTime, until: duration.endTime })),
		);
	}
}

export const externalDurationService = new ExternalDurationService();
