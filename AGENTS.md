<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# wakacraft — agent guide

wakacraft is a WakaTime-compatible time tracker: same HTTP API (so every WakaTime editor plugin works by setting
`api_url`), its own UI. When in doubt, follow what existing code already does.

## Stack

- **Next.js 16** App Router with **Cache Components** on (`next.config.ts`). Request data (`cookies()`, `headers()`,
  `searchParams`, the session) must be read inside a `<Suspense>` boundary — see `src/app/(app)/*/page.tsx`.
  `middleware` is now `src/proxy.ts`.
- **MongoDB + Mongoose 9**, **Zod 4** for every input and output contract, **Better Auth** (Mongo adapter) for
  identity, **Tailwind 4 + shadcn/ui** (radix-nova) + **Recharts** for UI, **bun** as package manager, **vitest** with
  an in-memory `mongod` for tests.

## Layout

```
src/
├── app/
│   ├── api/v1/users/[user]/…   WakaTime-compatible route handlers (thin: route() + one service call)
│   ├── api/auth/[...all]       Better Auth
│   ├── (app)/                  signed-in pages: dashboard, projects, settings
│   └── (auth)/                 login, signup
├── server/<domain>/            business logic, one folder per domain
│   ├── *.service.ts            singleton service; throws HttpError subclasses
│   ├── *.request.dto.ts        zod request schemas (snake_case wire → camelCase via .transform)
│   └── *.response.dto.ts       zod response schemas + to*Response() mappers (camelCase → WakaTime snake_case)
├── lib/
│   ├── mongo/
│   │   ├── schemas/*.schema.ts       hand-written Mongoose schemas — SOURCE OF TRUTH
│   │   ├── zod/*.dto.ts              GENERATED from schemas by `bun run sync` — never hand-edit
│   │   ├── <collection>/*.service.ts Mongo<Name>Service extends MongoBaseService (persistence only)
│   │   ├── MongoBaseService.ts       generic CRUD base (ported from the Aaabed BOS backend)
│   │   └── connection.ts             cached connection + HMR-safe model registry
│   ├── http/route.ts                 route() wrapper: auth → zod params/query/body → handler → JSON / errors
│   ├── http/authenticate.ts          session cookie, or API key via Basic/Bearer/?api_key= (wakatime-cli style)
│   ├── auth/                         Better Auth server/client, requireSession()
│   └── util/                         Constants, Heartbeats enums, Time (timezone/calendar), Snowflake
├── components/                       ui/ (shadcn), dashboard/, app/, settings/, auth/
└── test/                             end-to-end API tests + mongo global setup
```

## The rules that matter most

1. **Mongo schemas → zod codegen.** Edit `src/lib/mongo/schemas/*.schema.ts`, then run `bun run sync` to regenerate
   `src/lib/mongo/zod/`. Schema convention: export `XSchemaName` + `XSchema`, `{ timestamps: true, versionKey: false }`,
   `SchemaTypes.*`, `createSubSchema()` for embedded docs, snowflake `id` (never `_id`), `select: false` for secrets.
2. **Compose DTOs from generated schemas** (`HeartbeatZodSchema.shape.type`, `.pick()`, `.extend()`) and shared enums
   (`util/Heartbeats.ts`) instead of retyping shapes. Hand-roll a `z.object()` only for genuinely new shapes
   (aggregated responses, query strings).
3. **Layering.** Route handler → domain service (`src/server`) → `Mongo*Service` (`src/lib/mongo`). Route handlers
   never touch Mongo; domain services never touch Mongoose models directly.
4. **WakaTime wire compatibility is a feature.** Request/response field names, status codes and shapes under
   `/api/v1` follow WakaTime's API and wakatime-cli (`docs/wakatime-dashboard-teardown.md`). The bulk heartbeat
   response must stay `202 { responses: [[body, status], …] }`. `src/test/wakatime-compat.test.ts` guards this.
5. **Time accounting lives in `src/server/stats/engine.ts`** (pure, tested). A gap ≤ keystroke timeout is credited
   to the earlier heartbeat; credit is clipped at range end. Past days are cached in `DailySummary` rollups;
   ingestion deletes rollups for the affected dates. Don't compute durations anywhere else.
6. **Dates are local calendar strings** (`YYYY-MM-DD` in the user's timezone); convert with `util/Time.ts`
   (`localDayBounds`, `localDateOf`). Never use `new Date().toISOString().slice(0, 10)` for a user's "today".

## Commands

- `bun run db` — local mongod (no Docker), data in `.data/`
- `bun run dev` — app at http://localhost:3000
- `bun run sync` — regenerate zod DTOs after editing a schema
- `bun run test` — vitest (downloads a mongod binary on first run)
- `bun run seed:demo <email>` — 30 days of demo heartbeats for an existing account
- `bun run preflight` — sync, format, typecheck, lint, test, build
