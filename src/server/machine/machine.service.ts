import { mongoMachineService } from '@/lib/mongo/machine/machine.service';

import type { IMachineZodSchema } from '@/lib/mongo/zod';

class MachineService {
	public async touch(userId: string, name: string): Promise<IMachineZodSchema | null> {
		return mongoMachineService.updateOne(
			{ userId, name },
			{ $set: { lastSeenAt: new Date() }, $setOnInsert: { userId, name } },
			{ upsert: true, setDefaultsOnInsert: true },
		);
	}

	/** Upserts each distinct machine name once and returns them keyed by name. */
	public async touchMany(
		userId: string,
		names: (string | null | undefined)[],
	): Promise<Map<string, IMachineZodSchema>> {
		const distinct = [...new Set(names.filter((name): name is string => Boolean(name)))];
		const records = await Promise.all(distinct.map((name) => this.touch(userId, name)));
		return new Map(
			records.filter((record): record is IMachineZodSchema => record !== null).map((record) => [record.name, record]),
		);
	}

	public async list(userId: string): Promise<IMachineZodSchema[]> {
		return mongoMachineService.find({ userId }, '', { sort: { lastSeenAt: -1 } });
	}
}

export const machineService = new MachineService();
