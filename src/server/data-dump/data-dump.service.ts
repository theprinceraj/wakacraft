import { NotFoundException } from '@/lib/http/errors';
import { mongoDataDumpService } from '@/lib/mongo/data-dump/data-dump.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { DATA_DUMP_TTL_DAYS, type DataDumpType } from '@/lib/util/DataDumps';
import { addDays, eachDate, localDateOf, todayIn } from '@/lib/util/Time';
import { toHeartbeatResponse } from '@/server/heartbeat/heartbeat.response.dto';
import { machineService } from '@/server/machine/machine.service';
import { loadDayTotals } from '@/server/stats/day-totals';
import { toDaySummary } from '@/server/stats/stats.response.dto';
import { statsService } from '@/server/stats/stats.service';
import { toMachineResponse } from '@/server/machine/machine.response.dto';
import { toUserAgentResponse } from '@/server/user-agent/user-agent.response.dto';
import { userAgentService } from '@/server/user-agent/user-agent.service';

import type { IDataDumpZodSchema } from '@/lib/mongo/zod';

const DAILY_CHUNK_DAYS = 60;

const encoder = new TextEncoder();

/** Turns an async generator of JSON text fragments into a byte stream for a `Response`. */
function toStream(fragments: AsyncGenerator<string>): ReadableStream<Uint8Array> {
	return new ReadableStream({
		async pull(controller) {
			const { value, done } = await fragments.next();
			if (done) controller.close();
			else controller.enqueue(encoder.encode(value));
		},
		async cancel() {
			await fragments.return(undefined);
		},
	});
}

class DataDumpService {
	public async create(userId: string, type: DataDumpType): Promise<IDataDumpZodSchema> {
		return mongoDataDumpService.create({
			userId,
			type,
			expiresAt: new Date(Date.now() + DATA_DUMP_TTL_DAYS * 86_400_000),
		});
	}

	public async list(userId: string): Promise<IDataDumpZodSchema[]> {
		return mongoDataDumpService.find({ userId, expiresAt: { $gt: new Date() } }, '', { sort: { createdAt: -1 } });
	}

	public async open(
		userId: string,
		id: string,
	): Promise<{ dump: IDataDumpZodSchema; body: ReadableStream<Uint8Array> }> {
		const dump = await mongoDataDumpService.findOne({ userId, id, expiresAt: { $gt: new Date() } });
		if (!dump) throw new NotFoundException('This export does not exist or has expired');
		const body = toStream(dump.type === 'heartbeats' ? this.heartbeatsDump(userId) : this.dailyDump(userId));
		return { dump, body };
	}

	/**
	 * WakaTime's heartbeats dump: `{ user, range, days: [{ date, heartbeats }] }`, days in the user's timezone. The
	 * extra `user_agents` and `machines` lists let a wakacraft dump be re-imported with editor/OS names intact.
	 */
	private async *heartbeatsDump(userId: string): AsyncGenerator<string> {
		const [settings, first, last, userAgents, machines] = await Promise.all([
			statsService.resolveSettings(userId),
			mongoHeartbeatService.findFirst(userId),
			mongoHeartbeatService.findLast(userId),
			userAgentService.list(userId),
			machineService.list(userId),
		]);

		yield `{"user":${JSON.stringify({ id: userId, username: settings.username, timezone: settings.timezone })}`;
		yield `,"range":${JSON.stringify({ start: first?.time ?? null, end: last?.time ?? null })}`;
		yield `,"user_agents":${JSON.stringify(userAgents.map(toUserAgentResponse))}`;
		yield `,"machines":${JSON.stringify(machines.map(toMachineResponse))}`;
		yield ',"days":[';

		let currentDate: string | null = null;
		let firstInDay = true;
		for await (const heartbeat of mongoHeartbeatService.streamForUser(userId)) {
			const date = localDateOf(heartbeat.time, settings.timezone);
			if (date !== currentDate) {
				yield `${currentDate ? ']},' : ''}{"date":"${date}","heartbeats":[`;
				currentDate = date;
				firstInDay = true;
			}
			yield `${firstInDay ? '' : ','}${JSON.stringify(toHeartbeatResponse(heartbeat))}`;
			firstInDay = false;
		}
		yield `${currentDate ? ']}' : ''}]}`;
	}

	/** One WakaTime summary object per day from the first heartbeat to today. */
	private async *dailyDump(userId: string): AsyncGenerator<string> {
		const [settings, first] = await Promise.all([
			statsService.resolveSettings(userId),
			mongoHeartbeatService.findFirst(userId),
		]);
		const today = todayIn(settings.timezone);
		const start = first ? localDateOf(first.time, settings.timezone) : today;

		yield `{"user":${JSON.stringify({ id: userId, username: settings.username, timezone: settings.timezone })}`;
		yield `,"range":${JSON.stringify({ start, end: today })},"days":[`;

		let isFirst = true;
		for (let chunkStart = start; chunkStart <= today; chunkStart = addDays(chunkStart, DAILY_CHUNK_DAYS)) {
			const chunkEnd =
				addDays(chunkStart, DAILY_CHUNK_DAYS - 1) < today ? addDays(chunkStart, DAILY_CHUNK_DAYS - 1) : today;
			const dates = eachDate(chunkStart, chunkEnd);
			const totals = await loadDayTotals(userId, dates, settings);
			for (const date of dates) {
				yield `${isFirst ? '' : ','}${JSON.stringify(toDaySummary(date, totals.get(date)!, settings.timezone))}`;
				isFirst = false;
			}
		}
		yield ']}';
	}
}

export const dataDumpService = new DataDumpService();
