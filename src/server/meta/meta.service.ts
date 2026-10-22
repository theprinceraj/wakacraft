import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoOrgMemberService } from '@/lib/mongo/org-member/org-member.service';
import { round, toHumanDuration } from '@/lib/util/Time';
import { creditSeconds, type EngineHeartbeat } from '@/server/stats/engine';
import { statsService } from '@/server/stats/stats.service';
import { EDITOR_NAMES } from '@/server/user-agent/user-agent.parser';
import { userService } from '@/server/user/user.service';

import { PROGRAM_LANGUAGES } from './languages';

import type { FileExpertsInput } from './meta.request.dto';

const slug = (name: string) =>
	name
		.toLowerCase()
		.replace(/\+/g, 'p')
		.replace(/#/g, 'sharp')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** At most this many people are ranked for one file. */
const MAX_EXPERTS = 10;

class MetaService {
	/** WakaTime's `GET /meta`. wakacraft runs wherever you deploy it, so it publishes no fixed IP ranges. */
	public getMeta() {
		return { data: { ips: { api: [], website: [], worker: [] } } };
	}

	/** WakaTime's `GET /editors`: the editors wakacraft recognises in plugin user agents. */
	public listEditors() {
		const names = [...new Set(Object.values(EDITOR_NAMES))].sort((a, b) => a.localeCompare(b));
		const data = names.map((name) => ({
			id: slug(name),
			name,
			color: null,
			website: null,
			repository: null,
			version: null,
			version_url: null,
			history_url: null,
			released: true,
		}));
		return { data, total: data.length, total_pages: 1 };
	}

	/** WakaTime's `GET /program_languages`. */
	public listLanguages() {
		const data = PROGRAM_LANGUAGES.map(([name, color]) => ({ id: slug(name), name, color, is_verified: true }));
		return { data, total: data.length, total_pages: 1 };
	}

	/**
	 * wakatime-cli's `--file-experts`: who has spent the most time on a file — you and the people you share an
	 * organization with. Time is credited from each person's heartbeats in that project only, so a switch to another
	 * project inside a gap can over-credit a little; it ranks people, it isn't billing.
	 */
	public async fileExperts(userId: string, input: FileExpertsInput) {
		const memberships = await mongoOrgMemberService.find({ userId }, ['orgId']);
		const teammates = memberships.length
			? await mongoOrgMemberService.find({ orgId: { $in: memberships.map((m) => m.orgId) } }, ['userId'])
			: [];
		const people = [...new Set([userId, ...teammates.map((member) => member.userId)])];

		const now = Math.ceil(Date.now() / 1000);
		const totals = await Promise.all(
			people.map(async (personId) => {
				const settings = await statsService.resolveSettings(personId);
				const heartbeats = (await mongoHeartbeatService.findInRange(
					personId,
					0,
					now + 1,
					{ project: input.project },
					'time entity',
				)) as unknown as EngineHeartbeat[];
				const credits = creditSeconds(heartbeats, { timeoutSeconds: settings.timeoutMinutes * 60, rangeEnd: now });
				const seconds = heartbeats.reduce(
					(sum, heartbeat, index) => (heartbeat.entity === input.entity ? sum + credits[index] : sum),
					0,
				);
				return { personId, seconds };
			}),
		);

		const ranked = totals
			.filter((entry) => entry.seconds > 0)
			.sort((a, b) => b.seconds - a.seconds)
			.slice(0, MAX_EXPERTS);
		const data = await Promise.all(
			ranked.map(async ({ personId, seconds }) => {
				const user = await userService.getCurrentUser(personId);
				const human = toHumanDuration(seconds);
				return {
					user: {
						id: user.id,
						name: user.username ?? user.full_name ?? user.display_name,
						long_name: user.full_name ?? user.display_name,
						is_current_user: personId === userId,
					},
					total: { total_seconds: round(seconds), text: human.text, decimal: human.decimal, digital: human.digital },
				};
			}),
		);
		return { data };
	}
}

export const metaService = new MetaService();
