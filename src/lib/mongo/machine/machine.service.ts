import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { MachineSchema, MachineSchemaName } from '../schemas/machine.schema';

import type { IMachineZodSchema, IMachineZodSchemaInput } from '../zod';

export class MongoMachineService extends MongoBaseService<IMachineZodSchemaInput, IMachineZodSchema> {
	public readonly model = registerModel<IMachineZodSchemaInput, IMachineZodSchema>(MachineSchemaName, MachineSchema);
}

export const mongoMachineService = new MongoMachineService();
