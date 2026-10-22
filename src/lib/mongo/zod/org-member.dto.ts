/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const OrgMemberZodSchema = z.object({
	id: z.string(),
	orgId: z.string(),
	userId: z.string(),
	role: z.enum(['owner', 'admin', 'member']).default('member'),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialOrgMemberZodSchema = OrgMemberZodSchema.partial();

export type IOrgMemberZodSchema = TypeOf<typeof OrgMemberZodSchema>;
export type IOrgMemberZodSchemaInput = Omit<z.input<typeof OrgMemberZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof OrgMemberZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialOrgMemberZodSchema = TypeOf<typeof PartialOrgMemberZodSchema>;
