# wakacraft for Zed

Automatic time tracking for [wakacraft](https://wakacraft.tech) in Zed.

## Setup

1. Install the extension (until it's in the Zed registry: `zed: install dev extension` and pick this folder; Zed
   needs Rust installed via rustup to build it).
2. Give it your API key, from **Settings → API keys** on wakacraft. Either:
   - install the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=wakacraft.wakacraft) once and run **wakacraft: API Key** there (both editors share
     `~/.wakacraft`), or
   - add it to Zed's `settings.json`:

     ```json
     {
     	"lsp": {
     		"wakacraft": {
     			"settings": { "api-key": "waka_…" }
     		}
     	}
     }
     ```

     Use `settings`, not `initialization_options`: Zed passes initialization options straight to the language
     server, which would put the key on wakatime-cli's command line and in Zed's log. The extension hands the key to
     wakatime-cli through the environment instead. A key saved in `~/.wakacraft/.wakatime.cfg` takes precedence.

3. Open a file. Heartbeats start right away. Run `zed: open log` if nothing shows up on the dashboard.

### Self-hosting

Add `"api-url": "https://your-host/api/v1"` next to `api-key`. Zed can't read `~/.wakacraft/.wakatime.cfg`
(extensions run sandboxed), so without it the extension uses `https://wakacraft.tech/api/v1`, even when the VS
Code extension points the shared config at your server. Set the same server in both editors: they share one offline
queue, and whichever editor sends next flushes it to its own server.

## How it works

Zed extensions can't listen to editor events, so tracking runs through a language server attached to every buffer:
WakaTime's `wakatime-ls`, which turns open/edit/save notifications into
[wakatime-cli](https://github.com/wakatime/wakatime-cli) heartbeats. The extension downloads both binaries and
starts the server with `WAKATIME_HOME=~/.wakacraft`. The cli's config, offline queue and log stay there and never
mix with an official WakaTime setup in `~/.wakatime`. `WAKACRAFT_HOME` in your shell environment overrides the
directory.

The extension pins `wakatime-ls` v0.1.10 and falls back to already-downloaded binaries when GitHub is unreachable,
so tracking still starts offline and heartbeats wait in the offline queue.

Known limitations of `wakatime-ls` v0.1.10, which is WakaTime's binary:

- its progress indicator is labelled "WakaTime" (the dashboard still lists the editor as Zed);
- it marks every heartbeat as a write (it passes `--write false`, which wakatime-cli reads as `--write`), so the
  dashboard's writes-only views count all Zed activity.

## Development

```bash
rustup target add wasm32-wasip2
cargo build --release --target wasm32-wasip2
```

## License

MIT, unlike the rest of the repository (AGPL-3.0). The Zed extension registry doesn't accept AGPL
([allowed licenses](https://zed.dev/docs/extensions/publishing/license-requirements)), and `src/lib.rs` adapts
MIT-licensed code from wakatime/zed-wakatime (see `THIRD_PARTY_NOTICES.md`).
