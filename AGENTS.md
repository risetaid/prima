# Repository Guidelines

## Project Structure & Module Organization

- App: `src/app` (API routes, pages, middleware); cron at `src/app/api/cron`.
- Services: `src/services/{patient,reminder,whatsapp}` for business logic.
- Data: `src/db/schema.ts` (Drizzle) and `src/db/index.ts` (connection); soft-deletes via `deletedAt`.
- UI: `src/components` (admin, patient, reminder, ui, providers); content at `src/app/content`.
- Lib: `src/lib` (auth, cache, timezone, phone, validations, webhook, fonnte).

## Build, Test, and Development Commands

- Install: `bun install` — install dependencies.
- Dev: `bun run dev` — start Next.js dev server.
- Build: `bun run build` — production build (includes TS type checks).
- Start: `bun run start` — serve the production build.
- Lint: `bun run lint` — ESLint (Next core-web-vitals).
- DB: `bun run db:migrate`, `bun run db:generate`, `bun run db:studio`.
- Test: No test framework configured; use `bun run build` for type checking.

## Coding Style & Naming Conventions

- TypeScript strict; 2-space indent; Prettier + ESLint (Next config).
- Files: kebab-case; React components `PascalCase` in `*.tsx`.
- Variables/functions: `camelCase`; Drizzle columns `snake_case`, mapped to TS `camelCase`.
- Validate inputs with Zod in `src/lib/validations.ts`; respect RBAC guards.
- Imports: absolute paths from `src/`; group imports: third-party, then relative.
- Error handling: use try-catch with proper logging; return consistent API responses.
- Types: prefer explicit types; use Zod for runtime validation.

## Commit & Pull Request Guidelines

- Commits: imperative present tense; scope when helpful (e.g., `feat(reminders): add retry backoff`).
- PRs: clear description, linked issues, screenshots for UI, migration notes, and testing steps.
- Include cache invalidation notes (what keys) and security impact (roles, scopes) when relevant.

## Security & Configuration Tips

- Secrets in `.env.local` (never commit): `CLERK_*`, `DATABASE_URL`, `REDIS_*`, `MINIO_*`, `FONNTE_TOKEN`, `CRON_SECRET`.
- Enforce role checks server-side; protect routes via `middleware.ts` and service-level guards.

## Agent Tips

- Prefer service layer over inline logic; keep API routes thin.
- Invalidate Redis on patient/reminder/content changes; respect TTLs.
- All time logic in WIB; store UTC, convert using `lib/timezone.ts`.
- Always run `bun run lint` and `bun run build` before committing.
- Use existing components from `src/components/ui/` before creating new ones.
