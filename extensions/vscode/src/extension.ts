import { unwatchFile, watchFile } from 'node:fs';

import * as vscode from 'vscode';

import { configFile, DEFAULT_API_URL, ensureCli, ExitCode, logFile, readConfig, runCli, writeConfig } from './cli';
import { extraHeartbeat, heartbeatArgs, HeartbeatQueue, type Heartbeat } from './heartbeat';

const API_KEY_PATTERN = /^waka_[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const TODAY_REFRESH_MS = 2 * 60 * 1000;
const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;
/**
 * The first run in a new home reads every local AI agent transcript before sending; with a lot of history that has
 * taken longer than five minutes. Killing it would only make the next run start the scan over.
 */
const FIRST_HEARTBEAT_TIMEOUT_MS = 30 * 60 * 1000;
const UPDATE_CHECK_KEY = 'wakacraft.cliCheckedAt';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const INSTALL_RETRY_MS = 10 * 60 * 1000;

/** `https://host/api/v1` → `https://host`. */
const siteUrl = (apiUrl: string) => apiUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');

/** Accepts `https://host`, `https://host/` or `https://host/api/v1`; returns the API base or null. */
export function normalizeApiUrl(input: string): string | null {
	try {
		const url = new URL(input.trim());
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		const path = url.pathname.replace(/\/+$/, '');
		url.pathname = path.endsWith('/api/v1') ? path : `${path}/api/v1`;
		url.search = '';
		url.hash = '';
		return url.toString().replace(/\/+$/, '');
	} catch {
		return null;
	}
}

class Wakacraft implements vscode.Disposable {
	private readonly output = vscode.window.createOutputChannel('wakacraft');
	private readonly statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
	private readonly disposables: vscode.Disposable[] = [];
	private readonly plugin: string;
	private readonly queue = new HeartbeatQueue((heartbeats) => this.send(heartbeats));
	private ready = false;
	private sentOnce = false;
	private disposed = false;
	private installing: Promise<boolean> | undefined;
	private installRetry: NodeJS.Timeout | undefined;
	private apiUrl = DEFAULT_API_URL;
	private apiKey = '';
	private buildTasks = 0;
	private todayTimer: NodeJS.Timeout | undefined;
	private lastTodayAt = 0;

	constructor(private readonly context: vscode.ExtensionContext) {
		const version = (context.extension.packageJSON as { version: string }).version;
		// "vscode/1.105.0 vscode-wakacraft/0.1.0", or the fork's app name ("Cursor/…") so the dashboard tells them apart.
		const app = vscode.env.appName.toLowerCase().includes('visual studio code')
			? 'vscode'
			: vscode.env.appName.replace(/\s+/g, '-');
		this.plugin = `${app}/${vscode.version} vscode-wakacraft/${version}`;
	}

	async start(): Promise<void> {
		this.statusBar.show();
		this.registerCommands();
		if (!(await this.install())) return;

		await this.loadConfig();
		if (!this.apiKey && !this.disposed) {
			const choice = await vscode.window.showInformationMessage(
				'Connect wakacraft: paste an API key from your wakacraft settings to start tracking.',
				'Enter API key',
				'Get a key',
			);
			if (choice === 'Enter API key') await this.promptApiKey();
			if (choice === 'Get a key') await this.openSettings();
		}
	}

	/**
	 * Installs (or updates) wakatime-cli, then starts tracking. A failed install is retried every few minutes, and
	 * right away when a command needs the cli, instead of leaving the extension inert until the window reloads.
	 */
	private install(): Promise<boolean> {
		if (this.ready) return Promise.resolve(true);
		this.installing ??= this.runInstall().finally(() => (this.installing = undefined));
		return this.installing;
	}

	private async runInstall(): Promise<boolean> {
		clearTimeout(this.installRetry);
		this.setStatus('$(sync~spin) wakacraft', 'Installing wakatime-cli…');
		try {
			const lastCheck = this.context.globalState.get<number>(UPDATE_CHECK_KEY, 0);
			const checkForUpdate = Date.now() - lastCheck > UPDATE_CHECK_INTERVAL_MS;
			const version = await ensureCli(checkForUpdate);
			if (checkForUpdate) await this.context.globalState.update(UPDATE_CHECK_KEY, Date.now());
			this.log(`wakatime-cli ${version}, config ${configFile()}`);
		} catch (error) {
			if (this.disposed) return false;
			this.log(`Installing wakatime-cli failed, retrying in 10 minutes: ${String(error)}`);
			this.setStatus('$(warning) wakacraft', `Could not install wakatime-cli: ${String(error)}`, 'wakacraft.showLog');
			this.installRetry = setTimeout(async () => {
				if (await this.install()) await this.loadConfig();
			}, INSTALL_RETRY_MS);
			return false;
		}
		// The window may have closed while the download ran; don't start timers and watchers for a dead extension.
		if (this.disposed) return false;

		// Zed's sandboxed extension can't pass `--log-file`, but its wakatime-cli reads this shared config.
		try {
			if ((await readConfig('log_file')) !== logFile()) await writeConfig('log_file', logFile());
		} catch (error) {
			this.log(`Could not set the log file in ${configFile()}: ${String(error)}`);
		}
		if (this.disposed) return false;

		this.ready = true;
		// Hand edits to the config file (or the Zed extension, which shares it) take effect without a reload.
		watchFile(configFile(), { interval: 10_000 }, () => void this.loadConfig());
		this.disposables.push({ dispose: () => unwatchFile(configFile()) });
		this.listen();
		this.todayTimer = setInterval(() => void this.refreshToday(true), TODAY_REFRESH_MS);
		return true;
	}

	private async loadConfig(): Promise<void> {
		if (this.disposed) return;
		this.apiKey = await readConfig('api_key');
		this.apiUrl = (await readConfig('api_url')) || DEFAULT_API_URL;
		if (this.apiKey) {
			await this.refreshToday(true);
			this.onEditor(vscode.window.activeTextEditor, false);
		} else this.setStatus('$(key) wakacraft', 'Set your wakacraft API key to start tracking', 'wakacraft.apiKey');
	}

	private registerCommands(): void {
		this.disposables.push(
			vscode.commands.registerCommand('wakacraft.apiKey', () => this.promptApiKey()),
			vscode.commands.registerCommand('wakacraft.serverUrl', () => this.promptServerUrl()),
			vscode.commands.registerCommand('wakacraft.dashboard', () =>
				vscode.env.openExternal(vscode.Uri.parse(`${siteUrl(this.apiUrl)}/dashboard`)),
			),
			vscode.commands.registerCommand('wakacraft.showLog', async () => {
				this.output.show();
				try {
					await vscode.window.showTextDocument(vscode.Uri.file(logFile()), { preview: true });
				} catch {
					// No log yet: wakatime-cli only writes one after its first run.
				}
			}),
		);
	}

	private listen(): void {
		this.disposables.push(
			vscode.window.onDidChangeActiveTextEditor((editor) => this.onEditor(editor, false)),
			vscode.window.onDidChangeTextEditorSelection((event) => this.onEditor(event.textEditor, false)),
			vscode.workspace.onDidChangeTextDocument((event) => {
				const editor = vscode.window.activeTextEditor;
				if (editor?.document === event.document) this.onEditor(editor, false);
			}),
			vscode.workspace.onDidSaveTextDocument((document) => {
				const editor = vscode.window.activeTextEditor;
				if (editor?.document === document) this.onEditor(editor, true);
			}),
			vscode.tasks.onDidStartTask((event) => {
				if (event.execution.task.group === vscode.TaskGroup.Build) this.buildTasks++;
			}),
			vscode.tasks.onDidEndTask((event) => {
				if (event.execution.task.group === vscode.TaskGroup.Build) this.buildTasks = Math.max(0, this.buildTasks - 1);
			}),
		);
	}

	private onEditor(editor: vscode.TextEditor | undefined, isWrite: boolean): void {
		if (!this.ready || !this.apiKey || !editor) return;
		const { document } = editor;

		let uri = document.uri;
		// Notebook cells live inside the notebook file.
		if (uri.scheme === 'vscode-notebook-cell') uri = uri.with({ scheme: 'file', fragment: '' });
		// Output panels, git diffs, settings UIs and untitled buffers have no file for the cli to read.
		if (uri.scheme !== 'file') return;

		const position = editor.selection.active;
		const heartbeat: Heartbeat = {
			entity: uri.fsPath,
			time: Date.now() / 1000,
			isWrite,
			lineno: position.line + 1,
			cursorpos: position.character + 1,
			lines: document.lineCount,
			projectFolder: vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath,
			category: vscode.debug.activeDebugSession ? 'debugging' : this.buildTasks > 0 ? 'building' : 'coding',
		};
		this.queue.push(heartbeat);
	}

	/** One cli run: the first heartbeat on the command line, the rest through `--extra-heartbeats` on stdin. */
	private async send(heartbeats: Heartbeat[]): Promise<void> {
		const [first, ...rest] = heartbeats;
		const args = heartbeatArgs(first, { apiUrl: this.apiUrl, plugin: this.plugin });
		// wakatime-cli reads one line of JSON from stdin.
		const input = rest.length ? JSON.stringify(rest.map(extraHeartbeat)) + '\n' : undefined;
		if (input) args.push('--extra-heartbeats');
		const timeout = this.sentOnce ? HEARTBEAT_TIMEOUT_MS : FIRST_HEARTBEAT_TIMEOUT_MS;
		const { code, stderr } = await runCli(args, input, timeout);
		if (code !== -1) this.sentOnce = true;
		if (this.disposed) return;

		if (code === ExitCode.Success) {
			await this.refreshToday(false);
		} else if (code === ExitCode.ApiError || code === ExitCode.Backoff) {
			this.log(`Server unreachable; heartbeats saved offline and will be sent later. ${stderr}`);
			this.setStatus(
				'$(cloud-upload) wakacraft',
				`Offline: heartbeats are queued and will sync. ${stderr}`,
				'wakacraft.showLog',
			);
		} else if (code === ExitCode.InvalidApiKey) {
			this.setStatus(
				'$(key) wakacraft',
				'wakacraft rejected the API key. Click to enter a new one.',
				'wakacraft.apiKey',
			);
		} else {
			this.log(`wakatime-cli exited with ${code}: ${stderr}`);
			this.setStatus(
				'$(warning) wakacraft',
				`Heartbeat failed (exit ${code}). Click to view the log.`,
				'wakacraft.showLog',
			);
		}
	}

	/** Today's total in the status bar. Throttled to once a minute unless `force`. */
	private async refreshToday(force: boolean): Promise<void> {
		if (!this.ready || !this.apiKey || this.disposed) return;
		if (!force && Date.now() - this.lastTodayAt < 60_000) return;
		this.lastTodayAt = Date.now();

		if (!vscode.workspace.getConfiguration('wakacraft').get<boolean>('statusBar.enabled', true)) {
			this.statusBar.hide();
			return;
		}
		this.statusBar.show();

		const { code, stdout } = await runCli([
			'--today',
			'--today-hide-categories',
			'true',
			'--plugin',
			this.plugin,
			'--api-url',
			this.apiUrl,
		]);
		if (code === ExitCode.Success) {
			this.setStatus(
				`$(clock) ${stdout || '0 secs'}`,
				`wakacraft: today's coding time on ${siteUrl(this.apiUrl)}`,
				'wakacraft.dashboard',
			);
		} else if (code === ExitCode.InvalidApiKey) {
			this.setStatus(
				'$(key) wakacraft',
				'wakacraft rejected the API key. Click to enter a new one.',
				'wakacraft.apiKey',
			);
		}
	}

	private async promptApiKey(): Promise<void> {
		if (!(await this.install())) {
			return void vscode.window.showWarningMessage('wakacraft could not install wakatime-cli yet. See the log.');
		}

		const key = (
			await vscode.window.showInputBox({
				title: 'wakacraft API key',
				prompt: `Create one under Settings → API keys on ${siteUrl(this.apiUrl)}`,
				placeHolder: this.apiKey ? `${this.apiKey.slice(0, 9)}… (current)` : 'waka_…',
				password: true,
				ignoreFocusOut: true,
				validateInput: (value) =>
					API_KEY_PATTERN.test(value.trim())
						? undefined
						: 'Expected a key like waka_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
			})
		)
			?.trim()
			.toLowerCase();
		if (!key) return;

		const check = await this.checkKey(key);
		if (check === 'rejected') {
			return void vscode.window.showErrorMessage(`${siteUrl(this.apiUrl)} did not accept that API key.`);
		}
		if (check === 'unreachable') {
			const choice = await vscode.window.showWarningMessage(
				`Couldn't reach ${siteUrl(this.apiUrl)} to check the key. Save it anyway?`,
				'Save',
			);
			if (choice !== 'Save') return;
		}

		await writeConfig('api_key', key);
		// Written explicitly so the shared config never falls back to wakatime-cli's default server.
		await writeConfig('api_url', this.apiUrl);
		await this.loadConfig();
		vscode.window.showInformationMessage('wakacraft is tracking your coding time.');
	}

	private async checkKey(key: string): Promise<'ok' | 'rejected' | 'unreachable'> {
		try {
			const response = await fetch(`${this.apiUrl}/users/current`, {
				headers: { authorization: `Basic ${Buffer.from(key).toString('base64')}` },
				signal: AbortSignal.timeout(15_000),
			});
			if (response.ok) return 'ok';
			return response.status === 401 || response.status === 403 ? 'rejected' : 'unreachable';
		} catch {
			return 'unreachable';
		}
	}

	private async promptServerUrl(): Promise<void> {
		if (!(await this.install())) {
			return void vscode.window.showWarningMessage('wakacraft could not install wakatime-cli yet. See the log.');
		}

		const input = await vscode.window.showInputBox({
			title: 'wakacraft server',
			prompt: 'Only change this if you self-host wakacraft.',
			value: siteUrl(this.apiUrl),
			ignoreFocusOut: true,
			validateInput: (value) => (normalizeApiUrl(value) ? undefined : 'Enter an http(s) URL'),
		});
		const apiUrl = input && normalizeApiUrl(input);
		if (!apiUrl) return;

		await writeConfig('api_url', apiUrl);
		await this.loadConfig();
		vscode.window.showInformationMessage(`wakacraft now sends heartbeats to ${apiUrl}.`);
	}

	private openSettings() {
		return vscode.env.openExternal(vscode.Uri.parse(`${siteUrl(this.apiUrl)}/settings#api-keys`));
	}

	private setStatus(text: string, tooltip: string, command?: string): void {
		this.statusBar.text = text;
		this.statusBar.tooltip = tooltip;
		this.statusBar.command = command;
	}

	private log(message: string): void {
		this.output.appendLine(`[${new Date().toISOString()}] ${message}`);
	}

	dispose(): void {
		this.disposed = true;
		clearTimeout(this.installRetry);
		if (this.todayTimer) clearInterval(this.todayTimer);
		for (const disposable of this.disposables) disposable.dispose();
		this.statusBar.dispose();
		this.output.dispose();
	}
}

export function activate(context: vscode.ExtensionContext): void {
	const wakacraft = new Wakacraft(context);
	context.subscriptions.push(wakacraft);
	void wakacraft.start();
}

export function deactivate(): void {}
