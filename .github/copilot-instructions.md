<!-- Copilot instructions for the PRIMA codebase. Keep this short, concrete and actionable. -->

# PRIMA — Copilot instructions (concise)

These instructions tell an AI coding assistant what matters in this repository so it can be productive immediately.

1. High-level architecture

   - Next.js (App Router) frontend in `src/app/` with server and client components. Pages live under `src/app/*` and API routes under `src/app/api/*`.
   - Business logic lives in `src/services/` and reusable code in `src/lib/`.
   - Database schemas and migrations are in `db/` and `drizzle/`. Drizzle ORM is used throughout (`drizzle.config.ts`).
   - Scripts and utilities live in `scripts/` (DB setup, data dumps, fixers).

2. Key workflows & commands (what to run)

   - Local development (uses Bun):
     - Install: `bun install`
     - Dev server: `bun dev` (or `bun run dev`)
     - Build: `bun build` then `bun start` for production
   - Database (Drizzle):
     - Push schema: `bunx drizzle-kit push`
     - Run migrations/studio: `bunx drizzle-kit studio`
   - Tests & linting:
     - Run tests: `bun test`
     - Typecheck: `bunx tsc --noEmit` or `bunx tsc --noEmit`
     - Lint: `bun run lint`

3. Project-specific conventions (follow these exactly)

   - Packaging/runtime: project uses Bun (not npm/pnpm/yarn). Prefer Bun-specific commands and `bunx` for CLI tools.
   - Auth: Clerk is used for authentication; environment secrets live in `.env.local` (see `README.md` for vars). Look for `CLERK_` prefixes.
   - WhatsApp integration: WAHA (WhatsApp HTTP API); keys/config live under `WAHA_*` env vars and webhook endpoints in `src/app/api/webhooks/waha/*`.
   - Database: Drizzle ORM models in `db/` and migration SQL under `drizzle/migrations/`. When changing schema, update Drizzle migrations and run `drizzle-kit push`.
   - Schemas/validation: Zod is the primary validation library. Look for `zod` imports in `src/` and `lib/api-schemas.ts`.
   - Tests: Vitest is used; tests live under `tests/` (or alongside code). Use `bun test` and prefer small, focused tests.

4. Code patterns to follow / examples

   - API routes: keep thin controllers in `src/app/api/*` and delegate to `src/services/*` for business logic. Example: `src/app/api/...` -> `src/services/`.
   - Database access: use Drizzle queries from `db/` exports. Search for `db/` imports to find usage sites.
   - UI components: Tailwind + Shadcn/Radix patterns. Check `src/components/ui/` for common primitives.
   - Error handling: central error handler at `src/app/global-error.tsx` and helpers in `src/lib/error-handling` (search `global-error`). Prefer returning structured API errors (see `lib/api-schemas.ts`).

5. Integration points & external systems

   - Clerk (auth) — watch for webhook endpoints and Clerk envs.
   - WAHA (WhatsApp HTTP API) — message sending, webhooks, session management via `WAHA_*` env vars.
   - YouTube Data API — used by content importing; env var `YOUTUBE_API_KEY`.
   - Database — Neon/Postgres; connection via `DATABASE_URL`.

6. Files and directories to check first when triaging a change

   - `src/app/api/` — API surface
   - `src/services/` and `src/lib/` — business logic & helpers
   - `db/` and `drizzle/` — schema and migrations
   - `src/components/` and `src/app/` — UI/route structure
   - `scripts/` — maintenance scripts used in CI and local fixes

7. Common PR/content expectations

   - Include environment impacts (new env vars) in PR description.
   - When changing DB schema, add a migration under `drizzle/migrations/` and update `db/` schema files.
   - For feature changes touching multiple layers, include a short README or `docs/` note describing runtime impact and any manual steps (e.g., webhook config).

8. Quick examples to reference in edits

   - API -> service pattern: open `src/app/api/...` and find matching `src/services/...` call sites.
   - Migration example: `drizzle/migrations/0009_performance_indexes.sql`.
   - Script example: `scripts/nuke-recreate-database.ts` (DB reset flow).

9. Things NOT to change without human review

   - Secrets or environment variable defaults in `.env.*` files.
   - Drizzle migrations history — adding new migrations is fine, rewriting old ones requires coordination.
   - Authentication flows (Clerk) and webhook verification logic.

10. If you need more context
    - Read `README.md` for quick start and env var list.
    - Read `openspec/AGENTS.md` when planning spec-driven changes (proposals/designs).

If anything here is unclear or you'd like more examples for a specific area (APIs, DB, or WhatsApp flows), tell me which area to expand.
