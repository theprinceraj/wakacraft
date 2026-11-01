# wakacraft for VS Code

Automatic time tracking for [wakacraft](https://wakacraft.tech). Code as usual; your time, projects, languages and
branches show up on your wakacraft dashboard. Works in VS Code and its forks (Cursor, Windsurf, VSCodium, …).

## Setup

1. Install [wakacraft from the Marketplace](https://marketplace.visualstudio.com/items?itemName=wakacraft.wakacraft), or search for "wakacraft" in the Extensions view.
2. When prompted, paste an API key from **Settings → API keys** on wakacraft (or run **wakacraft: API Key** from the
   command palette).

Today's coding time appears in the status bar. Click it to open your dashboard.

## Commands

| Command                     | What it does                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `wakacraft: API Key`        | Set or replace your API key. The key is checked against the server before it is saved. |
| `wakacraft: Server URL`     | Point the extension at a self-hosted wakacraft (default `https://wakacraft.tech`).     |
| `wakacraft: Open Dashboard` | Open your dashboard in the browser.                                                    |
| `wakacraft: Show Log`       | Open the wakatime-cli log for troubleshooting.                                         |

## How it works

The extension drives [wakatime-cli](https://github.com/wakatime/wakatime-cli), which it downloads and keeps up to
date, so language and project detection, the offline queue and AI-agent tracking behave exactly as in WakaTime's
plugins.

Everything lives in its own directory, `~/.wakacraft` (`%USERPROFILE%\.wakacraft` on Windows): the config
(`.wakatime.cfg`), the offline queue and the log (`wakacraft.log`). It never reads or writes `~/.wakatime.cfg`, so it can run next to
the official WakaTime extension, and a WakaTime plugin rewriting that file can't redirect your wakacraft heartbeats.
The [Zed extension](../zed) uses the same directory, so one API key covers both editors.

Set `WAKACRAFT_HOME` to use a different directory.

## Development

```bash
bun install
bun run build          # compile to out/
bun run package        # build wakacraft-<version>.vsix
code --extensionDevelopmentPath="$PWD"   # try it in a new window
```
