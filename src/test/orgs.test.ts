import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as getTeamSummaries } from '@/app/api/v1/users/[user]/orgs/[org]/dashboards/[dashboard]/summaries/route';
import { connectMongo } from '@/lib/mongo/connection';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { orgService } from '@/server/org/org.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { basicAuth, call } from './api';
import { signUpTestUser } from './users';

const day = addDays(todayIn('UTC'), -1);
const ids: Record<string, string> = {};
let orgId: string;
let everyoneId: string;
let inviteCode: string;

async function makeUser(name: string, timezone: string, work: { project: string; minutes: number }[]) {
	const { user } = await signUpTestUser({ body: { email: `${name}@org.wakacraft.test`, name } });
	await userProfileService.updateSettings(user.id, { timezone });
	let offset = 0;
	for (const { project, minutes } of work) {
		await heartbeatService.ingest(
			user.id,
			Array.from({ length: minutes + 1 }, (_, index) => ({
				entity: `/src/${project}.ts`,
				type: 'file',
				project,
				language: 'TypeScript',
				time: localDayBounds(day, timezone).start + 10 * 3600 + (offset + index) * 60,
			})),
			{ userAgent: null, machineName: 'laptop' },
		);
		offset += minutes + 30;
	}
	ids[name] = user.id;
}

beforeAll(async () => {
	await connectMongo();
	await makeUser('owner', 'UTC', [{ project: 'api', minutes: 30 }]);
	await makeUser('dev', 'Asia/Kolkata', [
		{ project: 'api', minutes: 20 },
		{ project: 'side-project', minutes: 40 },
	]);
	await makeUser('outsider', 'UTC', [{ project: 'api', minutes: 10 }]);
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('organizations', () => {
	it('creates an org with the creator as owner and an Everyone dashboard', async () => {
		const { data } = await orgService.createOrg(ids.owner, 'Acme');
		orgId = data.id;
		inviteCode = data.invite_code!;
		expect(data).toMatchObject({ role: 'owner', can_manage: true, members_count: 1, dashboards_count: 1 });
		const dashboards = await orgService.listDashboards(ids.owner, orgId);
		everyoneId = dashboards.data[0].id;
		expect(dashboards.data[0]).toMatchObject({ name: 'Everyone', full_name: 'Acme / Everyone', members_count: 1 });
	});

	it('lets people join with the invite code, as members who cannot see it', async () => {
		const { data } = await orgService.joinOrg(ids.dev, inviteCode);
		expect(data).toMatchObject({ role: 'member', can_manage: false, invite_code: null, members_count: 2 });
		// Joining twice is harmless.
		expect((await orgService.joinOrg(ids.dev, inviteCode)).data.members_count).toBe(2);
		await expect(orgService.joinOrg(ids.dev, 'nope')).rejects.toThrow(/invite/);
	});

	it('keeps non-members out', async () => {
		await expect(orgService.getOrg(ids.outsider, orgId)).rejects.toThrow(/not a member/);
		await expect(orgService.teamSummaries(ids.outsider, orgId, everyoneId, { start: day, end: day })).rejects.toThrow(
			/not a member/,
		);
	});

	it('sums the team per day and ranks members', async () => {
		const summary = await orgService.teamSummaries(ids.owner, orgId, everyoneId, { start: day, end: day });
		expect(summary.cumulative_total.seconds).toBe(90 * 60);
		expect(summary.members.map((member) => [member.user.id, member.total_seconds])).toEqual([
			[ids.dev, 3600],
			[ids.owner, 1800],
		]);
		expect(summary.data[0].machines).toEqual([]);
		// The owner manages the org, so sees emails; the member doesn't.
		expect(summary.members[0].user.email).toBe('dev@org.wakacraft.test');
		const asMember = await orgService.teamSummaries(ids.dev, orgId, everyoneId, { start: day, end: day });
		expect(asMember.members[0].user.email).toBeNull();
	});

	it('scopes a dashboard to projects and members', async () => {
		await expect(
			orgService.createDashboard(ids.dev, orgId, { name: 'Nope', memberIds: [], projects: [] }),
		).rejects.toThrow(/owners and admins/);
		await expect(
			orgService.createDashboard(ids.owner, orgId, { name: 'Bad', memberIds: [ids.outsider], projects: [] }),
		).rejects.toThrow(/members of the organization/);

		const { data } = await orgService.createDashboard(ids.owner, orgId, {
			name: 'API team',
			memberIds: [ids.dev],
			projects: ['api'],
		});
		const summary = await orgService.teamSummaries(ids.owner, orgId, data.id, { start: day, end: day });
		expect(summary.cumulative_total.seconds).toBe(20 * 60);
		expect(summary.members).toHaveLength(1);

		// A member's own project outside the dashboard's scope can't be pulled in by asking for it.
		const side = await orgService.memberSummaries(ids.owner, orgId, data.id, ids.dev, {
			start: day,
			end: day,
			project: 'side-project',
		} as never);
		expect(side.cumulative_total.seconds).toBe(0);
		await expect(
			orgService.memberSummaries(ids.owner, orgId, data.id, ids.owner, { start: day, end: day } as never),
		).rejects.toThrow(/not on this dashboard/);
	});

	it('serves the team summary over the API with an API key', async () => {
		const { key } = await apiKeyService.create(ids.owner, 'org test');
		const { status, json } = await call(getTeamSummaries, {
			path: `/api/v1/users/current/orgs/${orgId}/dashboards/${everyoneId}/summaries?start=${day}&end=${day}`,
			params: { org: orgId, dashboard: everyoneId },
			headers: basicAuth(key),
		});
		expect(status).toBe(200);
		expect(json.cumulative_total.seconds).toBe(5400);
	});

	it('manages roles: owners promote, admins cannot touch admins or the owner', async () => {
		await orgService.joinOrg(ids.outsider, inviteCode);
		expect((await orgService.updateMemberRole(ids.owner, orgId, ids.dev, 'admin')).data.role).toBe('admin');
		expect((await orgService.getOrg(ids.dev, orgId)).data.invite_code).toBe(inviteCode);
		await expect(orgService.updateMemberRole(ids.dev, orgId, ids.owner, 'member')).rejects.toThrow(/owner/);
		await orgService.removeMember(ids.dev, orgId, ids.outsider);
		await expect(orgService.getOrg(ids.outsider, orgId)).rejects.toThrow(/not a member/);
	});

	it('rotates the invite, lets members leave and the owner delete', async () => {
		const { data } = await orgService.updateOrg(ids.owner, orgId, { regenerateInvite: true });
		expect(data.invite_code).not.toBe(inviteCode);
		await expect(orgService.joinOrg(ids.outsider, inviteCode)).rejects.toThrow(/invite/);

		expect(await orgService.leaveOrDelete(ids.dev, orgId)).toBe('left');
		expect(await orgService.leaveOrDelete(ids.owner, orgId)).toBe('deleted');
		expect((await orgService.listOrgs(ids.owner)).data).toEqual([]);
	});
});
