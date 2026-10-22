# Feature-parity roadmap

Goal: every WakaTime feature, behind wakacraft's own UI. Endpoints keep WakaTime's paths and shapes so existing
clients (plugins, status-bar widgets, README stat cards) work unchanged.

## Done — phase 1–4 (foundation, ingestion, aggregation, dashboard)

See the table in the README. Core engine rules are covered by unit tests; the wakatime-cli wire format by
`src/test/wakatime-compat.test.ts`.

## Next — phase 5: daily-use features

- [x] **Project detail page** — languages over time, files, branches, categories, editors, machines; color + repo
- [x] **Goals** — `goals`, `goals/:goal` (daily/weekly, at least/at most, project/language/editor/category filters,
      ignored weekdays and zero days, streaks, 14-day / 8-week history)
- [x] **Insights** — `insights/:type/:range` (all WakaTime types + `hours` time-of-day) and an Insights page
- [x] **Custom rules** — `custom_rules` + `custom_rules_progress`; applied at ingestion and to history in the
      background; editor in Settings
- [x] **Import from WakaTime** — heartbeats export uploaded in batches from the browser; re-runs are deduplicated
- [x] **Data export** — `data_dumps` (heartbeats / daily JSON), streamed on download
- [x] **Import via WakaTime API key** — resumable leased job, one day per request; waits out rate limits; key
      encrypted at rest and dropped when done; resumed by polling and the nightly cron
- [x] **OAuth-only sign-in** (GitHub; Google when configured) — no passwords, so no email service is needed

## Phase 6: social & sharing

- [x] Public profiles at `/@username` (`users/:username`, public `stats`) honouring the `*_public` flags
- [x] Public leaderboard (`leaders`, language filter) and private leaderboards with invite links
- [x] Shareables: embeddable SVG/JSON charts (languages, editors, activity; dark/light) and README badges per public project
- [x] Wrapped: year in review (totals, streak, best day, busiest month, peak hour, top languages/projects/editors, new languages, vs last year)

## Phase 7: teams & business

- [x] Organizations (`users/:user/orgs/*`): invite links, owner/admin/member roles, dashboards scoped to members and
      projects, team summaries, member summaries and durations
- [x] Invoices: clients with hourly rates, rounding and projects; frozen, numbered, printable invoices with status
- [x] External durations (`external_durations`, `.bulk`): meetings and other non-editor time, merged into all stats without double counting
- [ ] Commits (`projects/:project/commits`) with a GitHub/GitLab integration
- [x] OAuth 2 apps (`/oauth/authorize`, `/oauth/token`, `/oauth/revoke`, PKCE, refresh rotation) with per-route
      scopes; developer apps and authorized apps in Settings

## Platform

- [x] `meta`, `editors`, `program_languages`, `file_experts` (you + teammates in your orgs)
- [x] Global aggregated `stats/:range` (last 7/30 days across public users, per-breakdown privacy, hourly cache)
- [x] Rate limiting on ingestion (5000 heartbeats / 10 min per user, `429` + `Retry-After`)
- [x] Vercel cron (`/api/cron/rollups`, `CRON_SECRET`) pre-builds active users' yesterday
- [x] Close the rollup write race: a heartbeat arriving between computing a past day and caching it can leave that day
      stale until the next heartbeat for it (per-date generation counters, checked after writing)
- [x] Rollup format versioning (`ROLLUP_VERSION`) so code changes never serve stale cached totals
- [x] Collision-safe snowflake ids across concurrent processes
- [x] Theme switch (dark default, light, system) in the account menu; applied before first paint
