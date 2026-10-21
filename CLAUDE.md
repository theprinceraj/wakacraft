@AGENTS.md

The project's architecture, conventions and commands live in AGENTS.md. The single most important convention:
Mongoose schemas in `src/lib/mongo/schemas/` are the source of truth; run `bun run sync` after editing one, and compose
request/response zod DTOs from the generated schemas in `src/lib/mongo/zod/` rather than hand-rolling shapes.
