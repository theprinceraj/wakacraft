/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const OrgDashboardZodSchema = z.object({
	id: z.string(),
	orgId: z.string(),
	name: z.string().min(1).max(80),
	memberIds: z.array(z.string()).default([]),
	projects: z.array(z.string()).default([]),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialOrgDashboardZodSchema = OrgDashboardZodSchema.partial();

export type IOrgDashboardZodSchema = TypeOf<typeof OrgDashboardZodSchema>;
export type IOrgDashboardZodSchemaInput = Omit<z.input<typeof OrgDashboardZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof OrgDashboardZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialOrgDashboardZodSchema = TypeOf<typeof PartialOrgDashboardZodSchema>;
