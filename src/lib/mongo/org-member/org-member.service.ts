import { MongoBaseService } from '../MongoBaseService';
import { registerModel } from '../connection';
import { OrgMemberSchema, OrgMemberSchemaName } from '../schemas/org-member.schema';

import type { IOrgMemberZodSchema, IOrgMemberZodSchemaInput } from '../zod';

export class MongoOrgMemberService extends MongoBaseService<IOrgMemberZodSchemaInput, IOrgMemberZodSchema> {
	public readonly model = registerModel<IOrgMemberZodSchemaInput, IOrgMemberZodSchema>(
		OrgMemberSchemaName,
		OrgMemberSchema,
	);
}

export const mongoOrgMemberService = new MongoOrgMemberService();
