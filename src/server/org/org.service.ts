import { randomBytes } from 'node:crypto';

import { BadRequestException, ForbiddenException, NotFoundException } from '@/lib/http/errors';
import { mongoOrgDashboardService } from '@/lib/mongo/org-dashboard/org-dashboard.service';
import { mongoOrgMemberService } from '@/lib/mongo/org-member/org-member.service';
import { mongoOrgService } from '@/lib/mongo/org/org.service';
import { inBatches } from '@/lib/util/Async';
import { canManageOrg, OrgRoles, type OrgRole } from '@/lib/util/Orgs';
import { addDays, eachDate, humanizeSeconds, localDayBounds, round, toHumanDuration, todayIn } from '@/lib/util/Time';
import { toBreakdown } from '@/server/dashboard/dashboard.service';
import { loadDayTotals } from '@/server/stats/day-totals';
import { dailyAverage, toDaySummary } from '@/server/stats/stats.response.dto';
import { statsService, sumTotals } from '@/server/stats/stats.service';
import { userService } from '@/server/user/user.service';

import type { IOrgDashboardZodSchema, IOrgMemberZodSchema, IOrgZodSchema } from '@/lib/mongo/zod';
import type { StatTotal } from '@/server/stats/engine';
import type { DurationsQuery, SummariesQuery } from '@/server/stats/stats.request.dto';
import type { DashboardInput, TeamSummariesQuery, UpdateOrgInput } from './org.request.dto';

const MAX_ORGS_PER_USER = 20;
const MAX_DASHBOARDS_PER_ORG = 50;
/** Members computed concurrently for a team summary. */
const CONCURRENCY = 8;

const newInviteCode = () => randomBytes(9).toString('base64url');
const isoAt = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

interface Access {
	org: IOrgZodSchema;
	role: OrgRole;
}

class OrgService {
	// --- orgs -----------------------------------------------------------------------------------------------------

	public async listOrgs(userId: string) {
		const memberships = await mongoOrgMemberService.find({ userId }, ['orgId', 'role']);
		const orgs = await mongoOrgService.find({ id: { $in: memberships.map((m) => m.orgId) } }, '', {
			sort: { createdAt: 1 },
		});
		const roles = new Map(memberships.map((m) => [m.orgId, m.role]));
		const data = await Promise.all(orgs.map((org) => this.toOrgResponse({ org, role: roles.get(org.id)! })));
		return { data, total: data.length, total_pages: 1 };
	}

	public async createOrg(userId: string, name: string) {
		if ((await mongoOrgService.count({ ownerId: userId })) >= MAX_ORGS_PER_USER) {
			throw new BadRequestException(`You can own at most ${MAX_ORGS_PER_USER} organizations`);
		}
		const org = await mongoOrgService.create({ ownerId: userId, name, inviteCode: newInviteCode() });
		await Promise.all([
			mongoOrgMemberService.create({ orgId: org.id, userId, role: OrgRoles.Owner }),
			mongoOrgDashboardService.create({ orgId: org.id, name: 'Everyone' }),
		]);
		return { data: await this.toOrgResponse({ org, role: OrgRoles.Owner }) };
	}

	public async getOrg(userId: string, orgId: string) {
		return { data: await this.toOrgResponse(await this.requireMember(userId, orgId)) };
	}

	public async updateOrg(userId: string, orgId: string, input: UpdateOrgInput) {
		const access = await this.requireManager(userId, orgId);
		const org = await mongoOrgService.updateOne(
			{ id: orgId },
			{
				$set: {
					...(input.name ? { name: input.name } : {}),
					...(input.regenerateInvite ? { inviteCode: newInviteCode() } : {}),
				},
			},
		);
		return { data: await this.toOrgResponse({ ...access, org: org! }) };
	}

	/** The owner deletes the org; anyone else leaves it. */
	public async leaveOrDelete(userId: string, orgId: string): Promise<'deleted' | 'left'> {
		const { org } = await this.requireMember(userId, orgId);
		if (org.ownerId === userId) {
			await Promise.all([
				mongoOrgService.deleteOne({ id: orgId }, 'id'),
				mongoOrgMemberService.deleteMany({ orgId }),
				mongoOrgDashboardService.deleteMany({ orgId }),
			]);
			return 'deleted';
		}
		await mongoOrgMemberService.deleteMany({ orgId, userId });
		return 'left';
	}

	/** For the invite landing page: the org's name only, without joining. */
	public async previewInvite(inviteCode: string): Promise<{ name: string } | null> {
		return mongoOrgService.findOne({ inviteCode }, ['name']);
	}

	public async joinOrg(userId: string, inviteCode: string) {
		const org = await mongoOrgService.findOne({ inviteCode });
		if (!org) throw new NotFoundException('That invite link is not valid');
		const member = await mongoOrgMemberService.updateOne(
			{ orgId: org.id, userId },
			{ $setOnInsert: { orgId: org.id, userId, role: OrgRoles.Member } },
			{ upsert: true, setDefaultsOnInsert: true },
		);
		return { data: await this.toOrgResponse({ org, role: member!.role }) };
	}

	// --- members --------------------------------------------------------------------------------------------------

	public async listMembers(userId: string, orgId: string) {
		const access = await this.requireMember(userId, orgId);
		const members = await mongoOrgMemberService.find({ orgId }, '', { sort: { createdAt: 1 } });
		const data = await Promise.all(members.map((member) => this.toMemberResponse(member, access.role)));
		return { data, total: data.length, total_pages: 1 };
	}

	/** Owners promote and demote admins; admins can't touch the owner or each other. */
	public async updateMemberRole(userId: string, orgId: string, memberUserId: string, role: OrgRole) {
		const access = await this.requireManager(userId, orgId);
		const target = await this.requireTarget(access, orgId, memberUserId);
		const updated = await mongoOrgMemberService.updateOne({ orgId, userId: target.userId }, { $set: { role } });
		return { data: await this.toMemberResponse(updated!, access.role) };
	}

	public async removeMember(userId: string, orgId: string, memberUserId: string) {
		if (memberUserId === userId) {
			throw new BadRequestException('Leave the organization instead of removing yourself');
		}
		const access = await this.requireManager(userId, orgId);
		const target = await this.requireTarget(access, orgId, memberUserId);
		await mongoOrgMemberService.deleteMany({ orgId, userId: target.userId });
	}

	private async requireTarget(access: Access, orgId: string, memberUserId: string): Promise<IOrgMemberZodSchema> {
		const target = await mongoOrgMemberService.findOne({ orgId, userId: memberUserId });
		if (!target) throw new NotFoundException('Member not found');
		if (target.role === OrgRoles.Owner) throw new ForbiddenException("The owner's role can't be changed");
		if (target.role === OrgRoles.Admin && access.role !== OrgRoles.Owner) {
			throw new ForbiddenException('Only the owner can change an admin');
		}
		return target;
	}

	// --- dashboards -----------------------------------------------------------------------------------------------

	public async listDashboards(userId: string, orgId: string) {
		const { org } = await this.requireMember(userId, orgId);
		const [dashboards, memberIds] = await Promise.all([
			mongoOrgDashboardService.find({ orgId }, '', { sort: { createdAt: 1 } }),
			this.orgMemberIds(orgId),
		]);
		const data = dashboards.map((dashboard) => this.toDashboardResponse(org, dashboard, memberIds));
		return { data, total: data.length, total_pages: 1 };
	}

	public async createDashboard(userId: string, orgId: string, input: DashboardInput & { name: string }) {
		const { org } = await this.requireManager(userId, orgId);
		if ((await mongoOrgDashboardService.count({ orgId })) >= MAX_DASHBOARDS_PER_ORG) {
			throw new BadRequestException(`An organization can have at most ${MAX_DASHBOARDS_PER_ORG} dashboards`);
		}
		const memberIds = await this.orgMemberIds(orgId);
		const dashboard = await mongoOrgDashboardService.create({
			orgId,
			name: input.name,
			memberIds: this.validMembers(input.memberIds ?? [], memberIds),
			projects: input.projects ?? [],
		});
		return { data: this.toDashboardResponse(org, dashboard, memberIds) };
	}

	public async getDashboard(userId: string, orgId: string, dashboardId: string) {
		const { org } = await this.requireMember(userId, orgId);
		const [dashboard, memberIds] = await Promise.all([
			this.requireDashboard(orgId, dashboardId),
			this.orgMemberIds(orgId),
		]);
		return { data: this.toDashboardResponse(org, dashboard, memberIds) };
	}

	public async updateDashboard(userId: string, orgId: string, dashboardId: string, input: DashboardInput) {
		const { org } = await this.requireManager(userId, orgId);
		await this.requireDashboard(orgId, dashboardId);
		const memberIds = await this.orgMemberIds(orgId);
		const dashboard = await mongoOrgDashboardService.updateOne(
			{ id: dashboardId, orgId },
			{
				$set: {
					...(input.name ? { name: input.name } : {}),
					...(input.memberIds ? { memberIds: this.validMembers(input.memberIds, memberIds) } : {}),
					...(input.projects ? { projects: input.projects } : {}),
				},
			},
		);
		return { data: this.toDashboardResponse(org, dashboard!, memberIds) };
	}

	public async deleteDashboard(userId: string, orgId: string, dashboardId: string) {
		await this.requireManager(userId, orgId);
		await this.requireDashboard(orgId, dashboardId);
		await mongoOrgDashboardService.deleteOne({ id: dashboardId, orgId }, 'id');
	}

	public async dashboardMembers(userId: string, orgId: string, dashboardId: string) {
		const { role, dashboard } = await this.requireDashboardAccess(userId, orgId, dashboardId);
		const members = await this.membersOf(dashboard);
		const data = await Promise.all(members.map((member) => this.toMemberResponse(member, role)));
		return { data, total: data.length, total_pages: 1 };
	}

	public async memberSummaries(
		userId: string,
		orgId: string,
		dashboardId: string,
		memberUserId: string,
		query: SummariesQuery,
	) {
		const { dashboard } = await this.requireDashboardAccess(userId, orgId, dashboardId);
		await this.requireDashboardMember(dashboard, memberUserId);
		return statsService.getSummaries(memberUserId, query, { projects: dashboard.projects });
	}

	public async memberDurations(
		userId: string,
		orgId: string,
		dashboardId: string,
		memberUserId: string,
		query: DurationsQuery,
	) {
		const { dashboard } = await this.requireDashboardAccess(userId, orgId, dashboardId);
		await this.requireDashboardMember(dashboard, memberUserId);
		return statsService.getDurations(memberUserId, query, { projects: dashboard.projects });
	}

	/** Each dashboard member's per-day totals for `dates` (in that member's own timezone and settings). */
	private async teamDays(dashboard: IOrgDashboardZodSchema, dates: string[]) {
		const members = await this.membersOf(dashboard);
		const filter = { projects: dashboard.projects };
		return inBatches(members, CONCURRENCY, async (member) => {
			const settings = await statsService.resolveSettings(member.userId);
			const totals = await loadDayTotals(member.userId, dates, settings, filter);
			return { member, days: dates.map((date) => totals.get(date)!) };
		});
	}

	/**
	 * The whole team's time for a date range: per-day totals summed across members, plus each member's total for
	 * the range.
	 */
	public async teamSummaries(userId: string, orgId: string, dashboardId: string, query: TeamSummariesQuery) {
		const { role, dashboard } = await this.requireDashboardAccess(userId, orgId, dashboardId);
		const dates = eachDate(query.start, query.end);
		const [perMember, viewer] = await Promise.all([
			this.teamDays(dashboard, dates),
			statsService.resolveSettings(userId),
		]);

		const days = dates.map((_, index) => sumTotals(perMember.map((entry) => entry.days[index])));
		const cumulative = days.reduce((sum, day) => sum + day.totalSeconds, 0);
		const human = toHumanDuration(cumulative);
		const top = (items: StatTotal[]) =>
			items.slice(0, 5).map((item) => ({ name: item.name, total_seconds: round(item.totalSeconds) }));
		const members = await Promise.all(
			perMember.map(async ({ member, days: memberDays }) => {
				const range = sumTotals(memberDays);
				const activeDays = memberDays.filter((day) => day.totalSeconds > 0).length;
				const average = activeDays ? range.totalSeconds / activeDays : 0;
				return {
					user: (await this.toMemberResponse(member, role)).user,
					total_seconds: round(range.totalSeconds),
					human_readable_total: humanizeSeconds(range.totalSeconds),
					daily_average: round(average),
					human_readable_daily_average: humanizeSeconds(average),
					languages: top(range.languages),
					projects: top(range.projects),
				};
			}),
		);

		return {
			// Members' machines are their own business; a team view shows what was worked on, not where.
			data: dates.map((date, index) => toDaySummary(date, { ...days[index], machines: [] }, viewer.timezone)),
			members: members.sort((a, b) => b.total_seconds - a.total_seconds),
			start: isoAt(localDayBounds(query.start, viewer.timezone).start),
			end: isoAt(localDayBounds(query.end, viewer.timezone).end - 1),
			cumulative_total: {
				seconds: round(cumulative),
				text: human.text,
				decimal: human.decimal,
				digital: human.digital,
			},
			daily_average: dailyAverage(days),
		};
	}

	/** Everything the team dashboard page shows, for the last `rangeDays` days in the viewer's timezone. */
	public async getTeamView(userId: string, orgId: string, dashboardId: string, rangeDays: number) {
		const access = await this.requireDashboardAccess(userId, orgId, dashboardId);
		const viewer = await statsService.resolveSettings(userId);
		const end = todayIn(viewer.timezone);
		const dates = eachDate(addDays(end, -(rangeDays - 1)), end);
		const [perMember, orgMemberIds] = await Promise.all([
			this.teamDays(access.dashboard, dates),
			this.orgMemberIds(orgId),
		]);

		const range = sumTotals(perMember.flatMap((entry) => entry.days));
		const people = await Promise.all(
			perMember.map(async ({ member, days }) => {
				const total = sumTotals(days);
				const { user } = await this.toMemberResponse(member, access.role);
				return {
					id: member.userId,
					role: member.role,
					label: user.full_name ?? user.display_name,
					username: user.username,
					photo: user.photo,
					seconds: total.totalSeconds,
					activeDays: days.filter((day) => day.totalSeconds > 0).length,
					topLanguage: total.languages[0]?.name ?? null,
					topProject: total.projects[0]?.name ?? null,
					days: days.map((day) => day.totalSeconds),
				};
			}),
		);
		people.sort((a, b) => b.seconds - a.seconds);

		// Chart series are member names; disambiguate teammates who share one.
		const seen = new Map<string, number>();
		const labelled = people.map((person) => {
			const count = (seen.get(person.label) ?? 0) + 1;
			seen.set(person.label, count);
			return { ...person, label: count > 1 ? `${person.label} (${count})` : person.label };
		});
		const charted = labelled.filter((person) => person.seconds > 0);

		return {
			org: await this.toOrgResponse(access),
			dashboard: this.toDashboardResponse(access.org, access.dashboard, orgMemberIds),
			range: { start: dates[0], end, days: rangeDays },
			timezone: viewer.timezone,
			totalSeconds: range.totalSeconds,
			activeMembers: charted.length,
			members: labelled,
			seriesNames: charted.map((person) => person.label),
			daily: dates.map((date, index) => ({
				date,
				total: charted.reduce((sum, person) => sum + person.days[index], 0),
				series: Object.fromEntries(charted.map((person) => [person.label, person.days[index]])),
			})),
			languages: toBreakdown(range.languages, range.totalSeconds),
			projects: toBreakdown(range.projects, range.totalSeconds),
			editors: toBreakdown(range.editors, range.totalSeconds),
			categories: toBreakdown(range.categories, range.totalSeconds),
		};
	}

	// --- access ---------------------------------------------------------------------------------------------------

	private async requireMember(userId: string, orgId: string): Promise<Access> {
		const [org, membership] = await Promise.all([
			mongoOrgService.findOne({ id: orgId }),
			mongoOrgMemberService.findOne({ orgId, userId }, ['role']),
		]);
		if (!org) throw new NotFoundException('Organization not found');
		if (!membership) throw new ForbiddenException('You are not a member of this organization');
		return { org, role: membership.role };
	}

	private async requireManager(userId: string, orgId: string): Promise<Access> {
		const access = await this.requireMember(userId, orgId);
		if (!canManageOrg(access.role)) throw new ForbiddenException('Only owners and admins can do that');
		return access;
	}

	private async requireDashboard(orgId: string, dashboardId: string): Promise<IOrgDashboardZodSchema> {
		const dashboard = await mongoOrgDashboardService.findOne({ id: dashboardId, orgId });
		if (!dashboard) throw new NotFoundException('Dashboard not found');
		return dashboard;
	}

	private async requireDashboardAccess(userId: string, orgId: string, dashboardId: string) {
		const access = await this.requireMember(userId, orgId);
		return { ...access, dashboard: await this.requireDashboard(orgId, dashboardId) };
	}

	private async requireDashboardMember(dashboard: IOrgDashboardZodSchema, memberUserId: string) {
		const members = await this.membersOf(dashboard);
		if (!members.some((member) => member.userId === memberUserId)) {
			throw new NotFoundException('That user is not on this dashboard');
		}
	}

	/** The org members a dashboard shows. Members who left the org drop off even if still listed. */
	private async membersOf(dashboard: IOrgDashboardZodSchema): Promise<IOrgMemberZodSchema[]> {
		return mongoOrgMemberService.find(
			{ orgId: dashboard.orgId, ...(dashboard.memberIds.length ? { userId: { $in: dashboard.memberIds } } : {}) },
			'',
			{ sort: { createdAt: 1 } },
		);
	}

	private async orgMemberIds(orgId: string): Promise<Set<string>> {
		return new Set((await mongoOrgMemberService.find({ orgId }, ['userId'])).map((member) => member.userId));
	}

	private validMembers(requested: string[], memberIds: Set<string>): string[] {
		const unknown = requested.filter((id) => !memberIds.has(id));
		if (unknown.length) throw new BadRequestException('Dashboards can only include members of the organization');
		return [...new Set(requested)];
	}

	// --- responses ------------------------------------------------------------------------------------------------

	private async toOrgResponse({ org, role }: Access) {
		const [membersCount, dashboardsCount] = await Promise.all([
			mongoOrgMemberService.count({ orgId: org.id }),
			mongoOrgDashboardService.count({ orgId: org.id }),
		]);
		const manager = canManageOrg(role);
		return {
			id: org.id,
			name: org.name,
			role,
			can_manage: manager,
			is_owner: role === OrgRoles.Owner,
			invite_code: manager ? org.inviteCode : null,
			members_count: membersCount,
			dashboards_count: dashboardsCount,
			created_at: org.createdAt.toISOString(),
			modified_at: org.updatedAt.toISOString(),
		};
	}

	private async toMemberResponse(member: IOrgMemberZodSchema, viewerRole: OrgRole) {
		const user = await userService.getCurrentUser(member.userId);
		return {
			id: member.userId,
			role: member.role,
			user: {
				id: user.id,
				username: user.username,
				display_name: user.display_name,
				full_name: user.full_name,
				photo: user.photo,
				// Emails are for whoever manages the org, not every teammate.
				email: canManageOrg(viewerRole) ? user.email : null,
			},
			joined_at: member.createdAt.toISOString(),
		};
	}

	private toDashboardResponse(org: IOrgZodSchema, dashboard: IOrgDashboardZodSchema, orgMemberIds: Set<string>) {
		const members = dashboard.memberIds.filter((id) => orgMemberIds.has(id));
		return {
			id: dashboard.id,
			name: dashboard.name,
			full_name: `${org.name} / ${dashboard.name}`,
			member_ids: members,
			projects: dashboard.projects,
			members_count: dashboard.memberIds.length ? members.length : orgMemberIds.size,
			created_at: dashboard.createdAt.toISOString(),
			modified_at: dashboard.updatedAt.toISOString(),
		};
	}
}

export type OrgResponse = Awaited<ReturnType<OrgService['getOrg']>>['data'];
export type OrgMemberResponse = Awaited<ReturnType<OrgService['listMembers']>>['data'][number];
export type OrgDashboardResponse = Awaited<ReturnType<OrgService['getDashboard']>>['data'];
export type TeamView = Awaited<ReturnType<OrgService['getTeamView']>>;

export const orgService = new OrgService();
