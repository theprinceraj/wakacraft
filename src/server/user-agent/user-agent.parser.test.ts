import { describe, expect, it } from 'vitest';

import { parseUserAgent } from './user-agent.parser';

describe('parseUserAgent', () => {
	it.each([
		[
			'wakatime/v1.102.1 (windows-10.0.26100-x86_64) go1.24.1 vscode/1.98.0 vscode-wakatime/25.0.0',
			{ editor: 'VS Code', version: '1.98.0', os: 'Windows' },
		],
		[
			'wakatime/v1.102.1 (darwin-24.3.0-arm64) go1.24.1 Cursor/0.47.8 vscode-wakatime/25.0.0',
			{ editor: 'Cursor', version: '0.47.8', os: 'Mac' },
		],
		[
			'wakatime/v1.90.0 (linux-6.8.0-45-generic-x86_64) go1.22.5 neovim/0.10.1 vim-wakatime/11.1.1',
			{ editor: 'Neovim', version: '0.10.1', os: 'Linux' },
		],
		[
			'wakatime/v1.90.0 (linux-6.8.0-x86_64) go1.22.5 vim/9.1.0 vim-wakatime/11.1.1',
			{ editor: 'Vim', version: '9.1.0', os: 'Linux' },
		],
		[
			'wakatime/v1.95.0 (windows-10.0.22631-x86_64) go1.23.0 JetBrains/PyCharm-2024.2.1 JetBrains-wakatime/15.0.2',
			{ editor: 'PyCharm', version: '2024.2.1', os: 'Windows' },
		],
		[
			'wakatime/v1.95.0 (darwin-23.0.0-arm64) go1.23.0 sublime_text/4180 sublime-wakatime/10.0.1',
			{ editor: 'Sublime Text', version: '4180', os: 'Mac' },
		],
		[
			'wakatime/v2.28.0 (windows-10.0.26300-x86_64) go1.27.3 vscode/1.105.0 vscode-wakacraft/0.1.0',
			{ editor: 'VS Code', version: '1.105.0', os: 'Windows' },
		],
		[
			'wakatime/v2.28.0 (darwin-25.0.0-arm64) go1.27.3 Zed/1.26.2 zed-wakacraft/0.1.0',
			{ editor: 'Zed', version: '1.26.2', os: 'Mac' },
		],
	])('%s', (value, expected) => {
		expect(parseUserAgent(value)).toMatchObject(expected);
	});

	it('falls back to the plugin name when there is no editor token', () => {
		expect(parseUserAgent('wakatime/v1.90.0 (linux-6.8.0-x86_64) go1.22.5 emacs-wakatime/1.0.2')).toMatchObject({
			editor: 'Emacs',
			version: null,
		});
	});

	it('flags browser extensions', () => {
		expect(parseUserAgent('Chrome/129.0 chrome-wakatime/4.0.1')).toMatchObject({
			editor: 'Chrome',
			isBrowserExtension: true,
		});
	});

	it('title-cases an unknown editor', () => {
		expect(parseUserAgent('wakatime/v1 (linux-6-x86_64) go1 my-editor/2.0 my-editor-wakatime/1.0').editor).toBe(
			'My Editor',
		);
	});

	it('returns nulls for a missing user agent', () => {
		expect(parseUserAgent(undefined)).toEqual({
			editor: null,
			version: null,
			os: null,
			isBrowserExtension: false,
			isDesktopApp: false,
		});
	});
});
