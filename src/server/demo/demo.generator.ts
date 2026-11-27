import { createHash } from 'node:crypto';

import { startOfLocalDay } from '@/lib/util/Time';

const PROJECTS = [
	{
		name: 'wakacraft',
		weight: 5,
		languages: ['TypeScript', 'TypeScript', 'TSX', 'CSS', 'JSON'],
		deps: ['next', 'react', 'zod', 'mongoose'],
	},
	{ name: 'payments-api', weight: 3, languages: ['Go', 'Go', 'SQL', 'YAML'], deps: ['github.com/jackc/pgx'] },
	{
		name: 'ml-notebooks',
		weight: 1.5,
		languages: ['Python', 'Python', 'Markdown'],
		deps: ['numpy', 'pandas', 'torch'],
	},
	{ name: 'dotfiles', weight: 0.6, languages: ['Lua', 'Bash', 'TOML'], deps: [] },
	{ name: 'infra', weight: 1, languages: ['HCL', 'YAML', 'Docker'], deps: [] },
];
const AGENTS = [
	{
		value: 'wakatime/v1.102.1 (windows-10.0.26100-x86_64) go1.24.1 vscode/1.98.0 vscode-wakatime/25.0.0',
		machine: 'dev-laptop',
		weight: 5,
	},
	{
		value: 'wakatime/v1.102.1 (darwin-24.3.0-arm64) go1.24.1 Cursor/0.47.8 vscode-wakatime/25.0.0',
		machine: 'macbook-pro',
		weight: 3,
	},
	{
		value: 'wakatime/v1.95.0 (linux-6.8.0-x86_64) go1.23.0 neovim/0.10.1 vim-wakatime/11.1.1',
		machine: 'workstation',
		weight: 1,
	},
];
const CATEGORIES = [
	'coding',
	'coding',
	'coding',
	'coding',
	'debugging',
	'building',
	'writing tests',
	'code reviewing',
	'ai coding',
];

export interface GeneratedDay {
	heartbeats: Record<string, unknown>[];
	machineName: string;
}

/**
 * One UTC calendar day (`YYYY-MM-DD`) of plausible heartbeats, or `null` for a day off. The PRNG is seeded from the
 * date, so regenerating a day reproduces identical heartbeats (and ingestion dedups them). Heartbeats later than
 * `now` (epoch seconds) are left out.
 */
export function generateDay(date: string, now = Date.now() / 1000): GeneratedDay | null {
	let seed = (createHash('sha1').update(date).digest().readUInt32BE(0) % 2_147_483_646) + 1;
	const random = () => ((seed = (seed * 16_807) % 2_147_483_647) - 1) / 2_147_483_646;
	const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
	const weighted = <T extends { weight: number }>(items: T[]) => {
		let roll = random() * items.reduce((sum, item) => sum + item.weight, 0);
		return items.find((item) => (roll -= item.weight) <= 0) ?? items[0];
	};

	const dayStart = startOfLocalDay(date, 'UTC');
	const weekend = [0, 6].includes(new Date(dayStart * 1000).getUTCDay());
	if (random() < (weekend ? 0.55 : 0.08)) return null;

	const sessions = weekend ? 1 + Math.floor(random() * 2) : 2 + Math.floor(random() * 3);
	const agent = weighted(AGENTS);
	const heartbeats: Record<string, unknown>[] = [];

	for (let session = 0; session < sessions; session++) {
		const project = weighted(PROJECTS);
		let time = dayStart + (8 + session * 3.2 + random() * 1.5) * 3600;
		const end = time + (0.4 + random() * 1.8) * 3600;
		const category = pick(CATEGORIES);

		while (time < end && time < now) {
			const language = pick(project.languages);
			const ai = category === 'ai coding' || random() < 0.15;
			heartbeats.push({
				entity: `/home/dev/${project.name}/src/${language.toLowerCase()}-${Math.floor(random() * 12)}.${language === 'Python' ? 'py' : 'ts'}`,
				type: 'file',
				category,
				time,
				project: project.name,
				branch: random() < 0.7 ? 'main' : `feat/${pick(['charts', 'auth', 'sync', 'perf'])}`,
				language,
				dependencies: project.deps.length
					? project.deps.slice(0, 1 + Math.floor(random() * project.deps.length))
					: undefined,
				lines: 40 + Math.floor(random() * 400),
				lineno: 1 + Math.floor(random() * 300),
				is_write: random() < 0.3,
				...(ai ? { ai_line_changes: Math.floor(random() * 25), ai_session: `s-${dayStart}-${session}` } : {}),
				...(random() < 0.4 ? { human_line_changes: Math.floor(random() * 12) } : {}),
				user_agent: agent.value,
			});
			// Mostly steady typing, sometimes a pause longer than the 15-minute timeout.
			time += random() < 0.03 ? 20 * 60 : 30 + random() * 150;
		}
	}

	return heartbeats.length ? { heartbeats, machineName: agent.machine } : null;
}
