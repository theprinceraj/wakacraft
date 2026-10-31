/**
 * Parses WakaTime plugin user agents into the editor / OS names shown on the dashboard.
 *
 * Shape sent by wakatime-cli:
 *   wakatime/v1.102.1 (windows-10.0.26100-x86_64) go1.24.1 vscode/1.98.0 vscode-wakatime/25.0.0
 *   └ cli version     └ os-release-arch          └ go     └ editor/ver   └ plugin/ver
 * VS Code forks report their own app name in the editor slot (`Cursor/0.42.0 vscode-wakatime/…`). wakacraft's own
 * plugins (`extensions/`) name themselves `<editor>-wakacraft` and are parsed the same way.
 */

export interface ParsedUserAgent {
	editor: string | null;
	version: string | null;
	os: string | null;
	isBrowserExtension: boolean;
	isDesktopApp: boolean;
}

export const EDITOR_NAMES: Record<string, string> = {
	vscode: 'VS Code',
	code: 'VS Code',
	'visual-studio-code': 'VS Code',
	'visual studio code': 'VS Code',
	vscodium: 'VSCodium',
	cursor: 'Cursor',
	windsurf: 'Windsurf',
	trae: 'Trae',
	kiro: 'Kiro',
	positron: 'Positron',
	neovim: 'Neovim',
	nvim: 'Neovim',
	vim: 'Vim',
	emacs: 'Emacs',
	sublime: 'Sublime Text',
	sublime_text: 'Sublime Text',
	'sublime-text': 'Sublime Text',
	zed: 'Zed',
	helix: 'Helix',
	xcode: 'Xcode',
	visualstudio: 'Visual Studio',
	'visual-studio': 'Visual Studio',
	'android-studio': 'Android Studio',
	androidstudio: 'Android Studio',
	'intellij-idea': 'IntelliJ IDEA',
	intellij: 'IntelliJ IDEA',
	idea: 'IntelliJ IDEA',
	pycharm: 'PyCharm',
	webstorm: 'WebStorm',
	phpstorm: 'PhpStorm',
	goland: 'GoLand',
	rider: 'Rider',
	clion: 'CLion',
	rubymine: 'RubyMine',
	datagrip: 'DataGrip',
	rustrover: 'RustRover',
	fleet: 'Fleet',
	eclipse: 'Eclipse',
	netbeans: 'NetBeans',
	notepadpp: 'Notepad++',
	'notepad++': 'Notepad++',
	jupyter: 'Jupyter',
	jupyterlab: 'JupyterLab',
	obsidian: 'Obsidian',
	figma: 'Figma',
	blender: 'Blender',
	unity: 'Unity',
	godot: 'Godot',
	excel: 'Excel',
	word: 'Word',
	powershell: 'PowerShell',
	terminal: 'Terminal',
	zsh: 'Zsh',
	bash: 'Bash',
	fish: 'Fish',
	'claude-code': 'Claude Code',
	claude: 'Claude Code',
	codex: 'Codex',
	'gemini-cli': 'Gemini CLI',
	chrome: 'Chrome',
	firefox: 'Firefox',
	edge: 'Edge',
	safari: 'Safari',
	brave: 'Brave',
	opera: 'Opera',
	arc: 'Arc',
};

/** When the editor slot is missing, the plugin name still identifies the editor. */
const PLUGIN_EDITORS: Record<string, string> = {
	vscode: 'VS Code',
	vim: 'Vim',
	sublime: 'Sublime Text',
	emacs: 'Emacs',
	jetbrains: 'JetBrains',
	xcode: 'Xcode',
	chrome: 'Chrome',
	firefox: 'Firefox',
	edge: 'Edge',
	safari: 'Safari',
	zed: 'Zed',
};

/** `vscode-wakatime`, `Zed-wakatime`, and wakacraft's own `vscode-wakacraft`. */
const PLUGIN_SUFFIX = /-(?:wakatime|wakacraft)$/i;

const BROWSER_PLUGINS = new Set(['chrome', 'firefox', 'edge', 'safari', 'browser']);
const DESKTOP_PLUGINS = new Set(['desktop', 'macos', 'windows', 'linux']);

const OS_NAMES: Record<string, string> = {
	windows: 'Windows',
	darwin: 'Mac',
	macos: 'Mac',
	linux: 'Linux',
	freebsd: 'FreeBSD',
	openbsd: 'OpenBSD',
	netbsd: 'NetBSD',
	android: 'Android',
	ios: 'iOS',
};

const titleCase = (value: string) =>
	value
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');

export function normalizeEditorName(raw: string): string {
	const key = raw.trim().toLowerCase();
	return EDITOR_NAMES[key] ?? EDITOR_NAMES[key.replaceAll(' ', '-')] ?? titleCase(raw.trim());
}

export function parseUserAgent(value: string | null | undefined): ParsedUserAgent {
	const result: ParsedUserAgent = {
		editor: null,
		version: null,
		os: null,
		isBrowserExtension: false,
		isDesktopApp: false,
	};
	if (!value) return result;

	const osMatch = /\(([a-z]+)[\w.-]*\)/i.exec(value);
	if (osMatch) result.os = OS_NAMES[osMatch[1].toLowerCase()] ?? titleCase(osMatch[1]);

	// Tokens outside the parenthesised platform block: "name/version".
	const tokens = value
		.replace(/\([^)]*\)/g, ' ')
		.split(/\s+/)
		.map((token) => /^([^/\s]+)\/(\S+)$/.exec(token))
		.filter((match): match is RegExpExecArray => match !== null)
		.map((match) => ({ name: match[1], version: match[2] }));

	const pluginIndex = tokens.findIndex((token) => PLUGIN_SUFFIX.test(token.name));
	const pluginName = pluginIndex === -1 ? null : tokens[pluginIndex].name.toLowerCase().replace(PLUGIN_SUFFIX, '');

	if (pluginName) {
		result.isBrowserExtension = BROWSER_PLUGINS.has(pluginName);
		result.isDesktopApp = DESKTOP_PLUGINS.has(pluginName);
	}

	const editorToken = (pluginIndex > 0 ? tokens.slice(0, pluginIndex) : tokens)
		.filter((token) => !/^wakatime$/i.test(token.name) && !PLUGIN_SUFFIX.test(token.name))
		.at(-1);

	if (editorToken) {
		// JetBrains plugins send "JetBrains/PyCharm-2024.1" style tokens.
		const jetbrains = /^jetbrains$/i.test(editorToken.name)
			? /^([a-z-]+?)[-/]?(\d[\w.]*)?$/i.exec(editorToken.version)
			: null;
		if (jetbrains) {
			result.editor = normalizeEditorName(jetbrains[1]);
			result.version = jetbrains[2] ?? null;
		} else {
			result.editor = normalizeEditorName(editorToken.name);
			result.version = editorToken.version;
		}
	} else if (pluginName) {
		result.editor = PLUGIN_EDITORS[pluginName] ?? titleCase(pluginName);
		result.version = null;
	}

	return result;
}
