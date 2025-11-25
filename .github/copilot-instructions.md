# Copilot / AI Agent Quick Guide — PRIMA

This file surfaces the essential knowledge an AI agent (or Copilot) needs to be immediately productive in this repository. Keep guidance concise and code-specific.

- Quick entry points:

  - Read `README.md`, `CLAUDE.md`, and `WARP.md` for overall context and policies.
  - Check `src/app/api/*` (thin controllers), `src/services/*` (business logic), and `src/db/*` (Drizzle schema).
  - If a change involves multiple concerns (API, DB, UI), open the relevant service, repository, and route files.

- Big picture architecture (short):

  - Next.js App Router (server + client) with thin API controllers under `src/app/api/`.
  - Service layer in `src/services/` implements domain logic and delegates to repository/data access.
  - Drizzle ORM governs DB schema and queries; migrations live in `drizzle/migrations/`.
  - AI functionality uses Anthropic/Claude in `src/services/ai/*`.

- Developer workflows & commands:

  - Bun is required—use `bun` / `bunx` instead of npm/yarn.
  - Common commands:
    - `bun install`
    - `bun dev` (local dev server with Turbopack)
    - `bun build` / `bun start` (production)
    - `bun run lint`; `bunx tsc --noEmit`
    - `bun run test:comprehensive` (full comprehensive suite). Run specific categories with:
      - `bun run test:auth`
      - `bun run test:reminder`
      - `bun run test:whatsapp`
      - `bun run test:content`
      - `bun run test:load`
    - `bun run precommit` (lint + typecheck) — run before committing to ensure checks pass
    - DB: `bunx drizzle-kit generate` → `bunx drizzle-kit push` / `bun run db:migrate`
    - `bun run nuke-recreate-db` and `bun run setup-first-user` for local dumps

- Project-specific conventions to follow:

  - Thin controllers: keep API route handlers small — validate with Zod then call service functions.
  - Validation: Zod schemas reside under `src/lib` (find `api-schemas`); always validate inputs.
  - Error handling: Services throw typed errors; routes use `src/lib/error-handler` to format responses.
  - DB Schema changes: update schema in `src/db`, run `bunx drizzle-kit generate`, review SQL in `drizzle/migrations/` and then `bunx drizzle-kit push`.
  - Tests: New code must include Vitest unit tests and (where applicable) add comprehensive integration tests via `tests/comprehensive-suite/`.
  - Auth: Clerk protects routes via `src/middleware.ts`. Check when adding routes that require authentication.
  - WhatsApp/WAHA: Webhook handling is in `src/app/api/webhooks/waha/route.ts`. Be careful with idempotency (`/lib/idempotency`), logging, and rate-limiting.

- Integration points & environment vars:

  - Auth: Clerk (`CLERK_*` env vars)
  - Database: `DATABASE_URL` (Neon/Postgres)
  - Messaging: WAHA (`WAHA_*` env vars, `src/lib/waha.ts`)
  - File Storage: MinIO (`MINIO_*`)
  - Redis: `REDIS_URL` for rate limiting and caches
  - AI: Anthropic API key (`ANTHROPIC_API_KEY`) used by `src/services/ai/*`

- When making code changes (practical checklist):

  1. Run `bun run lint` and `bunx tsc --noEmit` (or simply `bun run precommit`) locally.
  2. Add/modify Zod schema for API inputs under `src/lib`.
  3. Add service logic under `src/services/` (no business logic in controllers).
  4. Add/modify Drizzle schema in `src/db/`, generate a migration, and add SQL if needed.
  5. Add tests in `tests/` (unit & comprehensive suite if relevant).
  6. Update docs/README or `drizzle/migrations/` and open a PR via `gh pr create`.

- GitHub workflow notes for AI agents:

  - Use `gh` CLI for PR operations (`gh pr create`) — avoid `git push` or `git pull` directly.
  - Follow Conventional Commits v1.0.0 for commit messages: https://www.conventionalcommits.org/en/v1.0.0/
    - Format: `<type>(optional-scope): <short description>`
    - Example: `feat(reminder): add scheduled snooze option`
  - Common commit types (short examples):
    - feat: `feat(whatsapp): add batching to message sender` — New feature
    - fix: `fix(reminder): prevent duplicate sends on retry` — Bug fix
    - docs: `docs: update README with db migration steps` — Documentation only
    - style: `style(ui): format code, no logic changes` — Formatting/whitespace
    - refactor: `refactor(api): simplify route handler` — Code changes without new features
    - perf: `perf(db): optimize query for scheduled reminders` — Performance improvements
    - test: `test(reminder): add unit tests for create flow` — Tests only
    - build: `build(deps): upgrade drizzle-kit` — Build or dependency changes
    - ci: `ci: update pipeline to run comprehensive tests` — CI config changes
    - chore: `chore: tidy up scripts` — Other maintenance tasks
    - revert: `revert: revert "feat(api): change response format"` — Revert a previous change
    - wip: `wip: start work on reminder batching` — Work in progress
    - BREAKING CHANGE: use `BREAKING CHANGE:` in the commit body for breaking changes (describe migration steps).
  - Use draft PRs for WIP code.

- Useful debugging locations:

  - API traces & route logic: `src/app/api/*`
  - Business rules & repo methods: `src/services/*`, specifically `reminder`, `patient`, `whatsapp`, `ai` services
  - DB: `src/db/schema.ts`, `drizzle/migrations/` and `scripts/` for DB helpers
  - Webhooks: `src/app/api/webhooks/*` (WAHA, Fonnte)
  - Utilities: `src/lib/*` (rate limiter, error handler, idempotency, logger)

- Safety & best practices:

  - Do NOT commit credentials; use `.env.local` for local dev.
  - Respect type-safety and run `bunx tsc --noEmit` or `bun run precommit` before PRs.
  - Always run `bun run precommit` before committing; it runs lint and type checks defined in `package.json` (helps prevent CI failures).
  - Avoid large refactor PRs without first proposing via `openspec/AGENTS.md` or `CLAUDE.md` (spec-driven development).

- TypeScript DOs & DON'Ts (quick guide):

  - See: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
  - DO: Keep `strict` typing enabled and prefer explicit return types for exported functions (services, repository methods).
  - DO: Prefer `unknown` + runtime `Zod` checks at API boundaries instead of `any`.
  - DON'T: Use `any` for public APIs or long-lived code paths (temporary `any` in tests/mocks is okay with a TODO).
  - DO: Use Drizzle's type-safe queries (`src/db/schema.ts`) instead of manual `any`-typed SQL payloads.
  - DO: Run `bunx tsc --noEmit` (or `bun run precommit`) and resolve typing errors before creating PRs.

- Where to find more detail:
  - `README.md` (project setup & commands)
  - `CLAUDE.md` and `WARP.md` for AI-specific guidance and conventions
  - `tests/comprehensive-suite/QUICKSTART.md` for the end-to-end testing guide

If anything is unclear or you'd like a different level of detail (eg. more examples or a checklist for a specific type of change), tell me which part and I’ll iterate.
