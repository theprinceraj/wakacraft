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
- [ ] **Custom rules** — rename/merge projects, remap languages by path pattern; re-apply to history
- [ ] **Import from WakaTime** — upload WakaTime's data export so users bring their history
- [ ] **Data export** — `data_dumps` (heartbeats / daily JSON)
- [ ] **Email**: verification, password reset (Better Auth needs a mail transport, e.g. Resend)

## Phase 6: social & sharing

- [ ] Public profiles (`users/:username`) honouring the `*_public` flags
- [ ] Public leaderboard (`leaders`) and private leaderboards (`users/current/leaderboards`, invites)
- [ ] Shareables: embeddable SVG/JSON charts, README badges per project, public project URLs
- [ ] Wrapped — year in review

## Phase 7: teams & business

- [ ] Organizations, dashboards, members (`orgs/*` endpoints), roles
- [ ] Invoices — clients, hourly rates, billable time per project
- [ ] Weekly email reports
- [ ] External durations (`external_durations`, `.bulk`) — meetings, calendar imports
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
