/**
 * Fills a user's account with ~30 days of plausible heartbeats so the dashboard can be explored before any real
 * editor is connected. Goes through the real ingestion service, so it also exercises dedup, projects and rollups.
 *
 *   bun run seed:demo you@example.com
 */
import { auth } from '../src/lib/auth/auth';
import { connectMongo } from '../src/lib/mongo/connection';
import { heartbeatService } from '../src/server/heartbeat/heartbeat.service';

const email = process.argv[2];
if (!email) {
	console.error('Usage: bun run seed:demo <email-of-existing-account>');
	process.exit(1);
}

await connectMongo();
const context = await auth.$context;
const found = await context.internalAdapter.findUserByEmail(email);
if (!found) {
	console.error(`No account for ${email}. Sign up in the app first.`);
	process.exit(1);
}
const userId = found.user.id;

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
	{ value: 'wakatime/v1.102.1 (windows-10.0.26100-x86_64) go1.24.1 vscode/1.98.0 vscode-wakatime/25.0.0', weight: 5 },
	{ value: 'wakatime/v1.102.1 (darwin-24.3.0-arm64) go1.24.1 Cursor/0.47.8 vscode-wakatime/25.0.0', weight: 3 },
	{ value: 'wakatime/v1.95.0 (linux-6.8.0-x86_64) go1.23.0 neovim/0.10.1 vim-wakatime/11.1.1', weight: 1 },
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

// Deterministic PRNG so reseeding gives the same picture.
let seed = 42;
const random = () => ((seed = (seed * 16_807) % 2_147_483_647) - 1) / 2_147_483_646;
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
const weighted = <T extends { weight: number }>(items: T[]) => {
	let roll = random() * items.reduce((sum, item) => sum + item.weight, 0);
	return items.find((item) => (roll -= item.weight) <= 0) ?? items[0];
};

const now = Date.now() / 1000;
let total = 0;

for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
	const weekend = [0, 6].includes(new Date((now - daysAgo * 86_400) * 1000).getUTCDay());
	if (random() < (weekend ? 0.55 : 0.08)) continue;

	const dayStart = Math.floor(now / 86_400) * 86_400 - daysAgo * 86_400;
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

	for (let index = 0; index < heartbeats.length; index += 100) {
		await heartbeatService.ingest(userId, heartbeats.slice(index, index + 100), {
			userAgent: null,
			machineName: agent.value.includes('darwin')
				? 'macbook-pro'
				: agent.value.includes('linux')
					? 'workstation'
					: 'dev-laptop',
		});
	}
	total += heartbeats.length;
}

console.info(`Seeded ${total} heartbeats for ${email}.`);
process.exit(0);
