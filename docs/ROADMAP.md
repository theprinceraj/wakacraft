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
- [ ] **Import via WakaTime API key** — pull history directly from wakatime.com without a file (resumable job)
- [x] **OAuth-only sign-in** (GitHub; Google when configured) — no passwords, so no email service is needed

## Phase 6: social & sharing

- [x] Public profiles at `/@username` (`users/:username`, public `stats`) honouring the `*_public` flags
- [x] Public leaderboard (`leaders`, language filter) and private leaderboards with invite links
- [x] Shareables: embeddable SVG/JSON charts (languages, editors, activity; dark/light) and README badges per public project
- [ ] Wrapped — year in review

## Phase 7: teams & business

- [ ] Organizations, dashboards, members (`orgs/*` endpoints), roles
- [ ] Invoices — clients, hourly rates, billable time per project
- [x] External durations (`external_durations`, `.bulk`): meetings and other non-editor time, merged into all stats without double counting
- [ ] Commits (`projects/:project/commits`) with a GitHub/GitLab integration
- [ ] OAuth 2 apps with scopes (`read_stats`, `read_summaries`, …) for third-party clients

## Platform

- [ ] `meta`, `editors`, `program_languages`, aggregated `stats/:range`, `file_experts`
- [ ] Rate limiting on ingestion
- [ ] Vercel cron to pre-build yesterday's rollups (today they are built on first read)
- [ ] Close the rollup write race: a heartbeat arriving between computing a past day and caching it can leave that day
      stale until the next heartbeat for it (store a heartbeat count/watermark with each rollup)
- [x] Rollup format versioning (`ROLLUP_VERSION`) so code changes never serve stale cached totals
- [x] Collision-safe snowflake ids across concurrent processes
- [ ] Light-theme toggle (tokens already exist)
