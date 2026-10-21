# wakacraft

Automatic time tracking for developers. wakacraft implements the WakaTime API, so **every WakaTime editor plugin
works with it unchanged**. Point the plugin at your wakacraft instance and keep coding.

Next.js 16 · TypeScript · MongoDB (Mongoose) · Zod · Better Auth · Tailwind + shadcn/ui

## Quick start

```bash
bun install
cp .env.example .env.local        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
bun run db                        # local MongoDB, no Docker needed (keep it running)
bun run dev                       # http://localhost:3000
```

Sign up, open **Settings → API keys**, create a key, then put this in `~/.wakatime.cfg`
(`%USERPROFILE%\.wakatime.cfg` on Windows):

```ini
[settings]
api_url = http://localhost:3000/api/v1
api_key = waka_…
```

Restart your editor. Heartbeats show up on the dashboard within a couple of minutes. To explore the UI before any
real activity exists: `bun run seed:demo you@example.com`.

## What works today

| Area | Status |
| --- | --- |
| Heartbeat ingestion — `POST heartbeats`, `heartbeats.bulk` (wakatime-cli wire format, offline-queue dedup), `GET`/`DELETE` heartbeats | ✅ |
| Auth — session, `Basic base64(api_key)`, `Bearer`, `?api_key=`; multiple hashed API keys per user | ✅ |
| `summaries` (start/end or named ranges, project/branch filters, timeout/writes_only/timezone overrides) | ✅ |
| `durations` with every `slice_by` · `stats` and `stats/:range` · `status_bar/today` (+ `statusbar/today` used by `wakatime-cli --today`) · `all_time_since_today` | ✅ |
| `projects`, `user_agents`, `machine_names`, `users/current` | ✅ |
| Editor/OS detection from plugin user agents (VS Code, Cursor, JetBrains IDEs, Neovim, …) | ✅ |
| AI coding fields (AI vs human line changes, tokens, sessions) | ✅ |
| Dashboard: stat tiles, 12-month heatmap, daily stacked chart, timeline, language/editor donuts, weekdays, projects, categories, machines | ✅ |
| CORS for browser-extension plugins | ✅ |

The full feature-parity plan is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Deploying to Vercel

1. Create a MongoDB Atlas cluster and copy the connection string.
2. Import the repo into Vercel and set `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your public URL),
   `MONGODB_TRANSACTIONS=true`, and optionally `GITHUB_*` / `GOOGLE_*` OAuth credentials.
3. Users set `api_url = https://<your-domain>/api/v1`.

## Development

See [AGENTS.md](AGENTS.md) for architecture and conventions. Key commands: `bun run sync` (regenerate zod DTOs after
a schema change), `bun run test`, `bun run preflight`.
