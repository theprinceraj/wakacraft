import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { readFile, writeFile, access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import process, { argv } from 'node:process';

import { Glob } from 'bun';

const STORE_FILE = join(import.meta.dirname, '../.srchash');
const SRC_DIR = join(import.meta.dirname, '../');

/**
 * Everything the generated zod depends on: the schemas, the `util/` modules they import enums and helpers from
 * (`util/Heartbeats.ts` holds the heartbeat category list, for one), and the generator itself. Hashing only the
 * schema files missed enum edits, so `sync` reported "no changes" and left the zod DTOs stale.
 */
const INPUT_GLOBS = ['./mongo/schemas/*.ts', './util/*.ts', './scripts/schemaToZod.ts'];

/** Input files in a stable order; `Glob.scan` order is filesystem-dependent. */
async function inputFiles(): Promise<string[]> {
	const files = new Set<string>();
	for (const pattern of INPUT_GLOBS) {
		for await (const file of new Glob(pattern).scan(SRC_DIR)) files.add(file.replaceAll('\\', '/'));
	}
	return [...files].sort();
}

async function calculateHash(): Promise<string> {
	const startTime = performance.now();
	const files = await inputFiles();
	console.log(`Found ${files.length} files for hashing.`);

	const hash = createHash('sha256');
	for (const file of files) {
		// Path included so renaming or moving content between files also counts as a change.
		hash
			.update(file)
			.update('\0')
			.update(await readFile(join(SRC_DIR, file)))
			.update('\0');
	}

	const endTime = performance.now();
	console.log(`Hash calculation took ${(endTime - startTime).toFixed(2)}ms`);
	return hash.digest('hex');
}

async function calculateSize(): Promise<string> {
	const startTime = performance.now();
	const sizes = await Promise.all((await inputFiles()).map((file) => stat(join(SRC_DIR, file)).then((s) => s.size)));
	const totalSize = sizes.reduce((sum, size) => sum + size, 0);
	console.log(`Found ${totalSize} bytes in schema input files.`);

	const endTime = performance.now();
	console.log(`Size calculation took ${(endTime - startTime).toFixed(2)}ms`);
	return totalSize.toString();
}

async function getPreviousValue(): Promise<string> {
	try {
		await access(STORE_FILE, constants.F_OK);
		return await readFile(STORE_FILE, 'utf8');
	} catch {
		return '';
	}
}

async function saveNewValue(value: string) {
	await writeFile(STORE_FILE, value);
}

async function runCommands() {
	const commands = ['bun ./src/lib/scripts/schemaToZod.ts'];

	for (const cmd of commands) {
		try {
			console.log(`Running: ${cmd}`);
			execSync(cmd, { stdio: 'inherit' });
		} catch {
			console.error(`Failed to run command: ${cmd}`);
			process.exit(1);
		}
	}
}

const scriptStartTime = performance.now();
const mode = argv.includes('--mode=size') ? 'size' : 'hash';
const force = argv.includes('--force');

if (force) {
	console.log('Force flag detected, running sync...');
	await runCommands();
	const currentValue = mode === 'size' ? await calculateSize() : await calculateHash();
	await saveNewValue(currentValue);
} else {
	const [currentValue, previousValue] = await Promise.all([
		(mode === 'size' ? calculateSize : calculateHash)(),
		getPreviousValue(),
	]);

	if (currentValue === previousValue) console.log(`No ${mode} changes detected in source files, skipping sync`);
	else {
		console.log(`Source files ${mode} changed, running sync...`);
		await runCommands();
		await saveNewValue(currentValue);
	}
}

const scriptEndTime = performance.now();
console.log(`Total script execution time: ${(scriptEndTime - scriptStartTime).toFixed(2)}ms`);
