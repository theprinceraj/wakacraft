import { z } from 'zod';

import { OrgDashboardZodSchema, OrgMemberZodSchema, OrgZodSchema } from '@/lib/mongo/zod';
import { OrgRoles } from '@/lib/util/Orgs';
import { dateParam } from '@/server/stats/stats.request.dto';

const name = OrgZodSchema.shape.name.trim().min(1).max(80);

export const CreateOrgSchema = z.object({ name });

export const UpdateOrgSchema = z
	.object({ name: name.optional(), regenerate_invite: z.boolean().optional() })
	.transform(({ regenerate_invite, ...rest }) => ({ ...rest, regenerateInvite: regenerate_invite ?? false }));

export type UpdateOrgInput = z.output<typeof UpdateOrgSchema>;

export const JoinOrgSchema = z.object({ code: OrgZodSchema.shape.inviteCode.trim().min(1).max(64) });

export const OrgParamsSchema = z.object({ user: z.string().min(1), org: OrgZodSchema.shape.id });

export const OrgMemberParamsSchema = OrgParamsSchema.extend({ member: OrgMemberZodSchema.shape.userId.min(1) });

/** Owners are made by creating an org, never by promotion. */
export const UpdateMemberSchema = z.object({ role: z.enum([OrgRoles.Admin, OrgRoles.Member]) });

const idList = z.array(z.string().trim().min(1).max(128)).max(500);

export const DashboardBodySchema = z
	.object({
		name: OrgDashboardZodSchema.shape.name.trim().min(1).max(80),
		member_ids: idList.optional(),
		projects: idList.optional(),
	})
	.transform(({ member_ids, ...rest }) => ({ ...rest, memberIds: member_ids }));

export const UpdateDashboardSchema = DashboardBodySchema.in.partial().transform(({ member_ids, ...rest }) => ({
	...rest,
	memberIds: member_ids,
}));

export type DashboardInput = z.output<typeof UpdateDashboardSchema>;

export const DashboardParamsSchema = OrgParamsSchema.extend({ dashboard: OrgDashboardZodSchema.shape.id });

export const DashboardMemberParamsSchema = DashboardParamsSchema.extend({
	member: OrgMemberZodSchema.shape.userId.min(1),
});

/** A team range is computed for every member, so it is capped lower than a single user's summaries. */
export const MAX_TEAM_DAYS = 93;

export const TeamSummariesQuerySchema = z
	.object({ start: dateParam, end: dateParam })
	.refine((query) => query.start <= query.end, { message: 'start must not be after end', path: ['end'] })
	.refine((query) => (Date.parse(query.end) - Date.parse(query.start)) / 86_400_000 < MAX_TEAM_DAYS, {
		message: `A team summary can span at most ${MAX_TEAM_DAYS} days`,
		path: ['end'],
	});

export type TeamSummariesQuery = z.output<typeof TeamSummariesQuerySchema>;
