import { mongoUserAgentService } from '@/lib/mongo/user-agent/user-agent.service';

import { parseUserAgent } from './user-agent.parser';

import type { IUserAgentZodSchema } from '@/lib/mongo/zod';

class UserAgentService {
	/** Upserts each distinct user-agent string once and returns them keyed by value. */
	public async touchMany(
		userId: string,
		values: (string | null | undefined)[],
	): Promise<Map<string, IUserAgentZodSchema>> {
		const distinct = [...new Set(values.filter((value): value is string => Boolean(value)))];
		const now = new Date();

		const records = await Promise.all(
			distinct.map((value) => {
				const parsed = parseUserAgent(value);
				return mongoUserAgentService.updateOne(
					{ userId, value },
					{
						$set: {
							lastSeenAt: now,
							editor: parsed.editor ?? undefined,
							version: parsed.version ?? undefined,
							os: parsed.os ?? undefined,
							isBrowserExtension: parsed.isBrowserExtension,
							isDesktopApp: parsed.isDesktopApp,
						},
						$setOnInsert: { userId, value },
					},
					{ upsert: true, setDefaultsOnInsert: true },
				);
			}),
		);

		return new Map(
			records
				.filter((record): record is IUserAgentZodSchema => record !== null)
				.map((record) => [record.value, record]),
		);
	}

	public async list(userId: string): Promise<IUserAgentZodSchema[]> {
		return mongoUserAgentService.find({ userId }, '', { sort: { lastSeenAt: -1 } });
	}
}

export const userAgentService = new UserAgentService();
