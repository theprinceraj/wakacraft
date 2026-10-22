import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { OrgDashboardSchema, OrgDashboardSchemaName } from '../schemas/org-dashboard.schema';

import type { IOrgDashboardZodSchema, IOrgDashboardZodSchemaInput } from '../zod';

export class MongoOrgDashboardService extends MongoBaseService<IOrgDashboardZodSchemaInput, IOrgDashboardZodSchema> {
	public readonly model = registerModel<IOrgDashboardZodSchemaInput, IOrgDashboardZodSchema>(
		OrgDashboardSchemaName,
		OrgDashboardSchema,
	);
}

export const mongoOrgDashboardService = new MongoOrgDashboardService();
