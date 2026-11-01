import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { extractZipEntry } from './unzip';

export const DEFAULT_API_URL = 'https://wakacraft.tech/api/v1';

/**
 * wakacraft's own wakatime-cli home. Passed as `WAKATIME_HOME`, it moves the cli's config, offline queue, logs and
 * internal state out of `~/.wakatime`, so a WakaTime plugin rewriting `~/.wakatime.cfg` can never redirect these
 * heartbeats, and queued heartbeats never sync to the wrong server. The Zed extension uses the same directory.
 */
export function wakacraftHome(): string {
	return process.env.WAKACRAFT_HOME || join(homedir(), '.wakacraft');
}

export const configFile = () => join(wakacraftHome(), '.wakatime.cfg');
/** wakatime-cli would name it `wakatime.log`; every run passes `--log-file`, and the shared config's `log_file` points Zed here too. */
export const logFile = () => join(wakacraftHome(), 'wakacraft.log');

const OS: Partial<Record<NodeJS.Platform, string>> = {
	win32: 'windows',
	darwin: 'darwin',
	linux: 'linux',
	freebsd: 'freebsd',
	openbsd: 'openbsd',
	netbsd: 'netbsd',
};
const ARCH: Partial<Record<string, string>> = { x64: 'amd64', arm64: 'arm64', ia32: '386', arm: 'arm' };

/** Release asset name, e.g. `wakatime-cli-windows-amd64`. The zip holds a binary of the same name. */
export function cliAssetName(platform = process.platform, arch = process.arch): string {
	const os = OS[platform];
	const cpu = ARCH[arch];
	if (!os || !cpu) throw new Error(`wakatime-cli has no build for ${platform}/${arch}`);
	return `wakatime-cli-${os}-${cpu}`;
}

export const cliPath = () => join(wakacraftHome(), cliAssetName() + (process.platform === 'win32' ? '.exe' : ''));

export interface CliResult {
	code: number;
	stdout: string;
	stderr: string;
}

/** wakatime-cli exit codes (`pkg/exitcode`). */
export const ExitCode = {
	Success: 0,
	/** The API was unreachable or errored; heartbeats were saved to the offline queue. */
	ApiError: 102,
	ConfigError: 103,
	InvalidApiKey: 104,
	/** Sending was postponed after recent API errors; heartbeats were saved to the offline queue. */
	Backoff: 112,
} as const;

/**
 * Runs wakatime-cli against the wakacraft home. Heartbeat runs need a generous timeout: the first run in a new home
 * parses every local AI agent transcript before sending, which can take minutes.
 */
export function runCli(args: string[], input?: string, timeoutMs = 60_000): Promise<CliResult> {
	return new Promise((resolve) => {
		const child = execFile(
			cliPath(),
			['--log-file', logFile(), ...args],
			{ env: cliEnv(), timeout: timeoutMs, windowsHide: true },
			(error, stdout, stderr) => {
				const code = error ? (typeof error.code === 'number' ? error.code : -1) : 0;
				const failure =
					error && code === -1 ? (error.killed ? `timed out after ${timeoutMs / 1000}s` : error.message) : '';
				resolve({ code, stdout: stdout.trim(), stderr: (stderr || failure).trim() });
			},
		);
		if (input !== undefined) child.stdin?.end(input);
	});
}

/**
 * The editor's environment with wakacraft's home. An inherited `WAKATIME_API_KEY` is the user's WakaTime key, which
 * wakatime-cli would otherwise use whenever the wakacraft config has no key.
 */
function cliEnv(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env, WAKATIME_HOME: wakacraftHome() };
	for (const name of Object.keys(env)) if (name.toUpperCase() === 'WAKATIME_API_KEY') delete env[name];
	return env;
}

export async function readConfig(key: string): Promise<string> {
	const { code, stdout } = await runCli(['--config-read', key]);
	return code === 0 ? stdout : '';
}

export async function writeConfig(key: string, value: string): Promise<void> {
	// pflag `stringToString`: `key=value`, parsed as CSV, so values must not contain commas (keys and URLs don't).
	const { code, stderr } = await runCli(['--config-write', `${key}=${value}`]);
	if (code !== 0) throw new Error(`Could not save ${key}: ${stderr || `wakatime-cli exited with ${code}`}`);
}

const exists = (path: string) =>
	stat(path).then(
		(s) => s.isFile(),
		() => false,
	);

async function installedVersion(): Promise<string | null> {
	if (!(await exists(cliPath()))) return null;
	const { code, stdout } = await runCli(['--version'], undefined, 15_000);
	return code === 0 ? stdout.replace(/^v?/, 'v') : null;
}

async function latestVersion(): Promise<string> {
	const response = await fetch('https://api.github.com/repos/wakatime/wakatime-cli/releases/latest', {
		headers: { accept: 'application/vnd.github+json', 'user-agent': 'wakacraft-vscode' },
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok) throw new Error(`GitHub releases responded ${response.status}`);
	const { tag_name } = (await response.json()) as { tag_name: string };
	return tag_name;
}

async function fetchOk(url: string, timeoutMs: number): Promise<Response> {
	const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
	if (!response.ok) throw new Error(`Downloading ${url} failed: ${response.status}`);
	return response;
}

/** The SHA-256 the release's `checksums_sha256.txt` lists for `file` (lines are `<hex>  <file name>`). */
export function checksumFor(checksums: string, file: string): string | undefined {
	for (const line of checksums.split(/\r?\n/)) {
		const [hash, name] = line.trim().split(/\s+/);
		if (name?.replace(/^\*/, '') === file) return hash.toLowerCase();
	}
	return undefined;
}

async function download(version: string): Promise<void> {
	const asset = cliAssetName();
	const base = `https://github.com/wakatime/wakatime-cli/releases/download/${version}`;
	const [zip, checksums] = await Promise.all([
		fetchOk(`${base}/${asset}.zip`, 120_000).then(async (response) => Buffer.from(await response.arrayBuffer())),
		fetchOk(`${base}/checksums_sha256.txt`, 30_000).then((response) => response.text()),
	]);

	const expected = checksumFor(checksums, `${asset}.zip`);
	const actual = createHash('sha256').update(zip).digest('hex');
	if (!expected) throw new Error(`${asset}.zip is not listed in the ${version} checksums`);
	if (actual !== expected) throw new Error(`${asset}.zip failed its checksum check (${actual} ≠ ${expected})`);

	const binary = extractZipEntry(zip, asset + (process.platform === 'win32' ? '.exe' : ''));
	await mkdir(wakacraftHome(), { recursive: true });
	// Unique per process: several editor windows may update at the same time.
	const temp = `${cliPath()}.${process.pid}-${Date.now()}.download`;
	await writeFile(temp, binary);
	await chmod(temp, 0o755);
	try {
		await rename(temp, cliPath());
	} catch (error) {
		// Windows can't replace a running binary; keep the current one and retry on the next check.
		await rm(temp, { force: true });
		if (!(await exists(cliPath()))) throw error;
	}
}

/**
 * Makes sure wakatime-cli is installed in the wakacraft home, updating it when `checkForUpdate` is set. Returns the
 * installed version. A failed update check is not an error as long as some version is already installed.
 */
export async function ensureCli(checkForUpdate: boolean): Promise<string> {
	const current = await installedVersion();
	if (current && !checkForUpdate) return current;

	try {
		const latest = await latestVersion();
		if (current === latest) return current;
		await download(latest);
		return latest;
	} catch (error) {
		if (current) return current;
		throw error;
	}
}
