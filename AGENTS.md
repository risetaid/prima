# Repository Guidelines

## Project Structure & Module Organization
- App: `src/app` (API routes, pages, middleware); cron at `src/app/api/cron`.
- Services: `src/services/{patient,reminder,whatsapp}` for business logic.
- Data: `db/schema.ts` (Drizzle), `db/index.ts` (conn), soft-deletes on all tables.
- UI: `src/components` (admin, patients, ui, providers), content at `src/app/content`.
- Lib: `src/lib` (auth, cache, timezone, phone, validations).
- Tests: `src/__tests__` for unit/integration.

## Build, Test, and Development Commands
- Install: `bun install` — install dependencies.
- Dev: `bun dev` — Next.js dev server.
- Build: `bun run build` — typecheck + Next build + schema gen.
- Start: `bun start` — run production build locally.
- Test: `bun test` — run test suite; `bun test -w` to watch.
- Lint/Format: `bun run lint` / `bun run format`.

## Coding Style & Naming Conventions
- TypeScript strict; 2-space indent; Prettier + ESLint (Next config).
- Files: kebab-case; React components `PascalCase` in `*.tsx`.
- Variables/functions: `camelCase`; Drizzle schema: `snake_case` columns, `camelCase` fields in TS.
- Follow soft-deletes (use `deletedAt`) and RBAC guards; validate with Zod in `lib/validations.ts`.

## Testing Guidelines
- Place tests in `src/__tests__` as `*.test.ts`/`*.test.tsx`.
- Cover services and API routes; include edge cases for timezone (WIB) and caching.
- Run with `bun test`; keep fast and isolated (no network; mock WhatsApp/Redis/DB).

## Commit & Pull Request Guidelines
- Commits: imperative present tense; scope when helpful (e.g., `feat(reminders): add retry backoff`).
- PRs: clear description, linked issues, screenshots for UI, migration notes, and testing steps.
- Include cache invalidation notes (what keys) and security impact (roles, scopes) when relevant.

## Security & Configuration Tips
- Secrets in `.env.local` (never commit): `CLERK_*`, `SUPABASE_*`, `DATABASE_URL`, `REDIS_URL`, `FONNTE_TOKEN`, `CRON_SECRET`.
- Enforce role checks server-side; protect routes via `middleware.ts` and service-level guards.

## Agent Tips
- Prefer service layer over inline logic; keep API routes thin.
- Invalidate Redis on patient/reminder/content changes; respect TTLs.
- All time logic in WIB; store UTC, convert using `lib/timezone.ts`.
