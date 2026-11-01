# wakacraft

An open-source alternative to WakaTime: automatic time tracking for developers. wakacraft implements the WakaTime API,
so **every WakaTime editor plugin works with it unchanged**. Point the plugin at a wakacraft instance and keep coding.

Every feature is free, with nothing behind a paid plan: dashboards, goals, insights, public profiles, leaderboards,
teams, invoices, and imports of your full history from WakaTime. Use the hosted instance at
[wakacraft.tech](https://wakacraft.tech) or run your own.

Next.js 16 · TypeScript · MongoDB (Mongoose) · Zod · Better Auth · Tailwind + shadcn/ui

## Quick start

```bash
bun install
cp .env.example .env.local        # set BETTER_AUTH_SECRET and GitHub OAuth keys (see below)
bun run db                        # local MongoDB, no Docker needed (keep it running)
bun run dev                       # http://localhost:3000
```

Sign-in is OAuth only: create a GitHub OAuth app (callback `http://localhost:3000/api/auth/callback/github`) and put
its client id/secret in `.env.local`. Google works the same way once its keys are set.

Sign in with GitHub, open **Settings → API keys**, create a key, then put this in `~/.wakatime.cfg`
(`%USERPROFILE%\.wakatime.cfg` on Windows):

```ini
[settings]
api_url = http://localhost:3000/api/v1
api_key = waka_…
```

Restart your editor. Heartbeats show up on the dashboard within a couple of minutes. To explore the UI before any
real activity exists: `bun run seed:demo you@example.com`.

## Editor extensions

Any WakaTime plugin works as described above, but every one of them shares `~/.wakatime.cfg`: when one plugin
rewrites that file, your heartbeats quietly go back to WakaTime. wakacraft's own extensions avoid this. They run
wakatime-cli with its own home, `~/.wakacraft` (config, offline queue, log), so they can run next to the official
WakaTime plugins without interfering:

- [VS Code](https://marketplace.visualstudio.com/items?itemName=wakacraft.wakacraft) (and Cursor, Windsurf, VSCodium): install from the Marketplace ([source](extensions/vscode))
- [Zed](extensions/zed): not in the Zed registry yet; install it as a dev extension

## What works today

| Area                                                                                                                                                              | Status |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Heartbeat ingestion — `POST heartbeats`, `heartbeats.bulk` (wakatime-cli wire format, offline-queue dedup), `GET`/`DELETE` heartbeats                             | ✅     |
| Auth — session, `Basic base64(api_key)`, `Bearer`, `?api_key=`; multiple hashed API keys per user                                                                 | ✅     |
| `summaries` (start/end or named ranges, project/branch filters, writes_only/timezone overrides; keystroke timeout fixed at 15 min)                                | ✅     |
| `durations` with every `slice_by` · `stats` and `stats/:range` · `status_bar/today` (+ `statusbar/today` used by `wakatime-cli --today`) · `all_time_since_today` | ✅     |
| `projects`, `user_agents`, `machine_names`, `users/current`                                                                                                       | ✅     |
| Editor/OS detection from plugin user agents (VS Code, Cursor, JetBrains IDEs, Neovim, …)                                                                          | ✅     |
| AI coding fields (AI vs human line changes, tokens, sessions)                                                                                                     | ✅     |
| Dashboard: stat tiles, 12-month heatmap, daily stacked chart, timeline, language/editor donuts, weekdays, projects, categories, machines                          | ✅     |
| CORS for browser-extension plugins                                                                                                                                | ✅     |

The full feature-parity plan is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Deploying to Vercel

1. Create a MongoDB Atlas cluster and copy the connection string.
2. Import the repo into Vercel and set `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your public URL),
   `MONGODB_TRANSACTIONS=true`, `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (OAuth app callback
   `https://<your-domain>/api/auth/callback/github`), and optionally `GOOGLE_*`.
3. Users set `api_url = https://<your-domain>/api/v1`.

## Development

See [AGENTS.md](AGENTS.md) for architecture and conventions. Key commands: `bun run sync` (regenerate zod DTOs after
a schema change), `bun run test`, `bun run preflight`.

## License

[AGPL-3.0](LICENSE). You can use, self-host and modify wakacraft freely. If you run a modified version as a network
service, you must publish your changes under the same license.
