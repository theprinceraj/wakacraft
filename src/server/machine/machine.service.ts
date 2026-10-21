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

	public async list(userId: string): Promise<IMachineZodSchema[]> {
		return mongoMachineService.find({ userId }, '', { sort: { lastSeenAt: -1 } });
	}
}

export const machineService = new MachineService();
