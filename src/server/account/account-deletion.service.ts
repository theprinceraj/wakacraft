import { ConflictException, ForbiddenException } from '@/lib/http/errors';
import { mongoApiKeyService } from '@/lib/mongo/api-key/api-key.service';
import { mongoClientService } from '@/lib/mongo/client/client.service';
import { mongoCustomRuleService } from '@/lib/mongo/custom-rule/custom-rule.service';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoDataDumpService } from '@/lib/mongo/data-dump/data-dump.service';
import { mongoExternalDurationService } from '@/lib/mongo/external-duration/external-duration.service';
import { mongoGlobalStatsService } from '@/lib/mongo/global-stats/global-stats.service';
import { mongoGoalService } from '@/lib/mongo/goal/goal.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoInvoiceService } from '@/lib/mongo/invoice/invoice.service';
import { mongoLeaderboardCacheService } from '@/lib/mongo/leaderboard-cache/leaderboard-cache.service';
import { mongoLeaderboardMemberService } from '@/lib/mongo/leaderboard-member/leaderboard-member.service';
import { mongoLeaderboardService } from '@/lib/mongo/leaderboard/leaderboard.service';
import { mongoMachineService } from '@/lib/mongo/machine/machine.service';
import { mongoOAuthAppService } from '@/lib/mongo/oauth-app/oauth-app.service';
import { mongoOAuthCodeService } from '@/lib/mongo/oauth-code/oauth-code.service';
import { mongoOAuthTokenService } from '@/lib/mongo/oauth-token/oauth-token.service';
import { mongoOrgDashboardService } from '@/lib/mongo/org-dashboard/org-dashboard.service';
import { mongoOrgMemberService } from '@/lib/mongo/org-member/org-member.service';
import { mongoOrgService } from '@/lib/mongo/org/org.service';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { mongoRateLimitService } from '@/lib/mongo/rate-limit/rate-limit.service';
import { mongoRollupInvalidationService } from '@/lib/mongo/rollup-invalidation/rollup-invalidation.service';
import { mongoRuleJobService } from '@/lib/mongo/rule-job/rule-job.service';
import { mongoUserAgentService } from '@/lib/mongo/user-agent/user-agent.service';
import { mongoUserProfileService } from '@/lib/mongo/user-profile/user-profile.service';
import { mongoWakatimeImportService } from '@/lib/mongo/wakatime-import/wakatime-import.service';
import { OrgRoles } from '@/lib/util/Orgs';
import { LIMITS } from '@/server/rate-limit/rate-limit.service';

/** What happens to each org the user belongs to (or owns). */
interface OrgPlan {
	/** Orgs where nobody else is left: deleted with their dashboards and memberships. */
	remove: string[];
	/**
	 * Orgs the user owns whose ownership passes to a member who stays: another owner, or (only once the user is already
	 * deleted, when refusing is no longer possible) the longest-standing member, who is promoted.
	 */
	handOver: { orgId: string; ownerId: string; promote?: boolean }[];
	/** Orgs the user simply leaves. */
	leave: string[];
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Removes everything a user owns, before Better Auth deletes the user, its sessions and its accounts. Every step
 * deletes by the user's id (or by ids found from it), so a run that fails halfway can simply be repeated.
 */
class AccountDeletionService {
	/**
	 * `afterUserDeleted`: the second pass, run once Better Auth has deleted the user, to sweep up whatever an in-flight
	 * request wrote in between. It never refuses: the account is gone either way.
	 */
	public async deleteAccountData(userId: string, { afterUserDeleted = false } = {}): Promise<void> {
		const profile = await mongoUserProfileService.findOne({ userId }, ['isDemo', 'loggedTimePublic']);
		if (profile?.isDemo && !afterUserDeleted) throw new ForbiddenException('The demo account cannot be deleted');

		// Refuse before touching anything.
		const orgs = await this.planOrgs(userId, afterUserDeleted);

		// Stop background work and cut off every credential first, so nothing writes new data meanwhile.
		await Promise.all([
			mongoWakatimeImportService.deleteMany({ userId }),
			mongoRuleJobService.deleteMany({ userId }),
			mongoApiKeyService.deleteMany({ userId }),
			mongoOAuthTokenService.deleteMany({ userId }),
			mongoOAuthCodeService.deleteMany({ userId }),
		]);

		await Promise.all([this.deleteOrgs(userId, orgs), this.deleteLeaderboards(userId), this.deleteOAuthApps(userId)]);

		await Promise.all([
			mongoHeartbeatService.deleteMany({ userId }),
			mongoProjectService.deleteMany({ userId }),
			mongoMachineService.deleteMany({ userId }),
			mongoUserAgentService.deleteMany({ userId }),
			mongoDailySummaryService.deleteMany({ userId }),
			mongoRollupInvalidationService.deleteMany({ userId }),
			mongoCustomRuleService.deleteMany({ userId }),
			mongoGoalService.deleteMany({ userId }),
			mongoExternalDurationService.deleteMany({ userId }),
			mongoDataDumpService.deleteMany({ userId }),
			mongoInvoiceService.deleteMany({ userId }),
			mongoClientService.deleteMany({ userId }),
			// Counter keys are `<bucket>:<userId>:…` (see rate-limit.service), one anchored prefix per bucket.
			mongoRateLimitService.deleteMany({
				$or: Object.keys(LIMITS).map((bucket) => ({ key: { $regex: `^${bucket}:${escapeRegex(userId)}:` } })),
			}),
		]);

		// Cached rankings that list them (public or private boards) would keep showing them and fail to find their
		// account, and site-wide stats are cached for an hour. Drop both once the data is gone, so nothing recomputes
		// it back in. Without a profile (a repeated run) there is no telling whether they were public: drop the stats.
		await Promise.all([
			mongoLeaderboardCacheService.deleteMany({ 'entries.userId': userId }),
			!profile || profile.loggedTimePublic ? mongoGlobalStatsService.deleteMany({}) : null,
		]);

		// Last: the profile is how the demo guard and the stats check above recognize the user.
		await mongoUserProfileService.deleteMany({ userId });
	}

	/**
	 * Decides each org's fate, or refuses when the user owns an org that others still belong to and no other owner
	 * would remain. `force` (the user is already deleted) promotes the longest-standing member instead of refusing.
	 */
	private async planOrgs(userId: string, force: boolean): Promise<OrgPlan> {
		const [memberships, owned] = await Promise.all([
			mongoOrgMemberService.find({ userId }, ['orgId', 'role']),
			mongoOrgService.find({ ownerId: userId }, ['id']),
		]);
		const orgIds = [...new Set([...memberships.map((m) => m.orgId), ...owned.map((org) => org.id)])];
		if (!orgIds.length) return { remove: [], handOver: [], leave: [] };

		const [orgs, others] = await Promise.all([
			mongoOrgService.find({ id: { $in: orgIds } }, ['id', 'name', 'ownerId']),
			mongoOrgMemberService.find({ orgId: { $in: orgIds }, userId: { $ne: userId } }, ['orgId', 'userId', 'role'], {
				sort: { createdAt: 1 },
			}),
		]);
		const roles = new Map(memberships.map((m) => [m.orgId, m.role]));
		const plan: OrgPlan = { remove: [], handOver: [], leave: [] };
		const blocking: string[] = [];

		for (const org of orgs) {
			const rest = others.filter((member) => member.orgId === org.id);
			if (!rest.length) {
				plan.remove.push(org.id);
				continue;
			}
			const isOwner = org.ownerId === userId || roles.get(org.id) === OrgRoles.Owner;
			if (!isOwner) {
				plan.leave.push(org.id);
				continue;
			}
			const nextOwner = rest.find((member) => member.role === OrgRoles.Owner);
			if (nextOwner) plan.handOver.push({ orgId: org.id, ownerId: nextOwner.userId });
			else if (force) plan.handOver.push({ orgId: org.id, ownerId: rest[0].userId, promote: true });
			else blocking.push(org.name);
		}
		// Memberships of orgs that no longer exist are leftovers; clean them up with the rest.
		plan.leave.push(...orgIds.filter((id) => !orgs.some((org) => org.id === id)));

		if (blocking.length) {
			const names = new Intl.ListFormat('en', { type: 'conjunction' }).format(blocking.map((name) => `"${name}"`));
			throw new ConflictException(
				`You own ${blocking.length === 1 ? 'a team' : 'teams'} that other people still belong to. Delete ${names} first, or remove the other members.`,
			);
		}
		return plan;
	}

	private async deleteOrgs(userId: string, plan: OrgPlan) {
		await Promise.all([
			...plan.handOver.map(({ orgId, ownerId }) =>
				mongoOrgService.updateMany({ id: orgId, ownerId: userId }, { $set: { ownerId } }),
			),
			...plan.handOver
				.filter(({ promote }) => promote)
				.map(({ orgId, ownerId }) =>
					mongoOrgMemberService.updateMany({ orgId, userId: ownerId }, { $set: { role: OrgRoles.Owner } }),
				),
			mongoOrgDashboardService.deleteMany({ orgId: { $in: plan.remove } }),
			mongoOrgMemberService.deleteMany({ orgId: { $in: plan.remove } }),
			// Dashboards elsewhere drop the user. An empty `memberIds` means "every member", so a dashboard that showed
			// only them is deleted rather than silently widened to the whole org.
			mongoOrgDashboardService.deleteMany({ memberIds: [userId] }),
		]);
		await mongoOrgDashboardService.updateMany({ memberIds: userId }, { $pull: { memberIds: userId } });
		await Promise.all([
			mongoOrgService.deleteMany({ id: { $in: plan.remove } }),
			mongoOrgMemberService.deleteMany({ userId }),
		]);
	}

	/** Boards the user owns go with their members and cached rankings; boards they joined lose them. */
	private async deleteLeaderboards(userId: string) {
		const ownedIds = (await mongoLeaderboardService.find({ ownerId: userId }, ['id'])).map((board) => board.id);
		await Promise.all([
			mongoLeaderboardMemberService.deleteMany({ $or: [{ leaderboardId: { $in: ownedIds } }, { userId }] }),
			mongoLeaderboardCacheService.deleteMany({ board: { $in: ownedIds } }),
		]);
		await mongoLeaderboardService.deleteMany({ id: { $in: ownedIds } });
	}

	/** Apps the user created, and every code and token issued for them. */
	private async deleteOAuthApps(userId: string) {
		const appIds = (await mongoOAuthAppService.find({ ownerId: userId }, ['id'])).map((app) => app.id);
		if (!appIds.length) return;
		await Promise.all([
			mongoOAuthTokenService.deleteMany({ appId: { $in: appIds } }),
			mongoOAuthCodeService.deleteMany({ appId: { $in: appIds } }),
		]);
		await mongoOAuthAppService.deleteMany({ id: { $in: appIds } });
	}
}

export const accountDeletionService = new AccountDeletionService();
