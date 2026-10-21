# WakaTime dashboard teardown

Observed 2026-10-22 on https://wakatime.com/dashboard ("Last 7 Days" view, logged-in session, dark theme).
Method: live page inspection via Claude in Chrome (resource timing, DOM, computed styles, and
re-issuing the page's own GET requests to read response shapes). Only key names/types were
recorded, not values.

Legend: **observed** = seen directly; _inferred_ = reasoned from what was seen.

## 1. Data / API

All calls are same-origin XHR to `https://wakatime.com/api/v1/`, authenticated by the session
cookie. **Observed** on dashboard load:

| Endpoint                                    | Query params                                                   | Feeds                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET users/current/summaries`               | `start`, `end` (YYYY-MM-DD), `cache`, `paywalled`              | headline totals, projects, categories, editors/languages/OS/machines pies, weekdays, daily average |
| `GET users/current/durations`               | `date`, `paywalled`, `use_cache`                               | per-project timeline for one day                                                                   |
| `GET users/current/durations`               | `date`, `slice_by` (e.g. `language`), `paywalled`, `use_cache` | second timeline sliced by language/etc.                                                            |
| `GET users/current/ai/heuristics`           | `start`, `end`, `cache`                                        | AI vs human, models pie                                                                            |
| `GET users/current/dangling_branches/alert` | –                                                              | banner                                                                                             |
| `GET users/current/alerts/latest`           | –                                                              | banner                                                                                             |
| `POST? metrics/timing`                      | –                                                              | client perf telemetry (fired several times; ignore)                                                |

_Inferred_: durations are fetched twice (first `use_cache` absent, then `use_cache`) — likely a
fast-then-fresh refresh pattern.

The public versions of these endpoints are documented at https://wakatime.com/developers and
accept an API key (`Authorization: Basic base64(api_key)`) instead of the cookie.

### `summaries` response

```
{ data: Day[], start, end,
  cumulative_total: { seconds, text, digital, decimal },
  daily_average: { holidays, days_minus_holidays, days_including_holidays,
                   seconds, seconds_including_other_language,
                   text, text_including_other_language } }

Day = { grand_total, projects[], languages[], editors[], operating_systems[],
        categories[], dependencies[], machines[], branches?[],
        range: { start, end, date, text, timezone } }

StatItem (languages/editors/categories/…) =
  { name, total_seconds, percent, digital, decimal, text, hours, minutes, seconds }

grand_total / project items also carry AI fields:
  ai_additions, ai_deletions, human_additions, human_deletions,
  ai_input_tokens, ai_cached_input_tokens, ai_output_tokens,
  ai_sessions, ai_prompt_events_total, ai_prompt_length_sum/avg/median…,
  ai_model_costs {}, ai_model_breakdown [], ai_model_total_cost, ai_model_line_changes {}
```

### `durations` response

```
{ data: Duration[], start, end, timezone }
Duration = { time (unix seconds, float), duration (seconds), project, color (null or hex),
             + same ai_* / human_* fields }
with slice_by=language, items also have: language, _is_ai_coding, _is_manual_coding,
                                          manual_coding_seconds
```

One day returned 19 durations.

### `ai/heuristics` response (`data` object, partial key list)

`is_up_to_date, is_stale, start, end, timezone, timeout, writes_only, review_events,
follow_up_events, follow_up_lines, ai_edit_sessions, ai_touched_files, files_with_review(_percent),
files_with_follow_up(_percent), follow_up_window_seconds, ai_model_*, average_ai_usage,
top_files, top_ai_files, top_human_files, …`

## 2. Frontend stack (observed)

- Server-rendered page + **Backbone 1.4.1**, **Underscore 1.8.3** (`_.VERSION`), **jQuery**
- **Mustache 2.3.0** templates embedded as `<script type="x-tmpl-mustache" id="…-template">`
  (dashboard, durations, tooltips, duration modals, AI cost/tokens/follow-up modals, …)
- Charts: **billboard.js 3.11.3** on **d3 7.6.1**; the daily durations timelines are custom
  d3 SVG (not billboard)
- **moment 2.30.1** for dates
- Bundled assets under `/static/sdist/<hash>.js|css`; Bootstrap-style grid classes
  (`col-xs-12`, `m-top-xs-30`, …)

For a rebuild, a modern equivalent would be e.g. React/Svelte + a chart lib (ECharts, Recharts,
or billboard.js itself) — that's a design choice, not something WakaTime requires.

## 3. Layout (observed, 1536px viewport)

- Top navbar: logo left; "Upgrade", "Dashboard", avatar right.
- Left sidebar (~200px): Dashboard, Teams, Projects, AI (new), Insights, Reports, Invoices,
  Goals, Shareables, Leaderboards, Wrapped, Integrations, Supported IDEs; footer links below.
- Header: small "WAKATIME DASHBOARD" eyebrow, H1 "Activity Overview", date-range button
  ("Last 7 Days") + download button on the right.
- Hero card: big total ("7 hrs 35 mins", 46px / 600) + three stat tiles:
  Current Day, Daily Average, Most Active day.
- Two-column grid of cards (each ~630px wide):

| Row | Left                                    | Right                                     | Chart type                                                           |
| --- | --------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| 1   | `coding-activity` Projects              | `categories-bar` Categories               | line/area per project · stacked bar strip + bars                     |
| 2   | `durations` today's timeline by project | `durations-slice-by` timeline by language | custom d3 swimlane, 12a→12a axis, prev/next day arrows, settings cog |
| 3   | `models-pie` AI models                  | `editors-pie`                             | donut                                                                |
| 4   | `languages-pie`                         | `os-pie`                                  | donut                                                                |
| 5   | `machines-pie`                          | `daily-average`                           | donut · gauge-style arc                                              |
| 6   | `ai-vs-human-by-day`                    | `weekdays`                                | grouped/stacked bars · bars                                          |
| 7   | `projects` (full width)                 |                                           | project cards: name + time                                           |

## 4. Visual tokens (observed, dark theme)

| Token                     | Value                                                    |
| ------------------------- | -------------------------------------------------------- |
| page bg                   | `rgb(9, 13, 19)` / `#090D13`                             |
| card bg (`.chart-box`)    | `rgb(15, 22, 32)` / `#0F1620`                            |
| card border               | `1px rgba(255,255,255,0.07)`                             |
| card radius / padding     | `12px` / `20px 22px`                                     |
| text                      | `rgb(225, 231, 239)` / `#E1E7EF`; card text `#E6EBF2`    |
| font                      | Rubik, sans-serif                                        |
| hero number               | 46px, weight 600                                         |
| accents (from screenshot) | cyan / blue bars, indigo segment, blue date-range button |

## 5. Unknowns

- Exact chart colors per series (project `color` was null in this sample, so the palette
  is probably assigned client-side).
- Light-theme tokens, responsive breakpoints, and other date-range views weren't checked.
- Payloads were checked for one user and one 7-day range; fields may vary for other plans.
