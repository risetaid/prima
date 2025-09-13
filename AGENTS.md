# Repository Guidelines

## Project Structure & Module Organization
- App: `src/app` (API routes, pages, middleware); cron at `src/app/api/cron`.
- Services: `src/services/{patient,reminder,whatsapp}` for business logic.
- Data: `src/db/schema.ts` (Drizzle) and `src/db/index.ts` (connection); soft-deletes via `deletedAt`.
- UI: `src/components` (admin, patient, reminder, ui, providers); content at `src/app/content`.
- Lib: `src/lib` (auth, cache, timezone, phone, validations, webhook, fonnte).
- Tests: `src/__tests__` for unit/integration.

## Build, Test, and Development Commands
- Install: `bun install` — install dependencies.
- Dev: `bun run dev` — start Next.js dev server.
- Build: `bun run build` — production build (includes TS type checks).
- Start: `bun run start` — serve the production build.
- Lint: `bun run lint` — ESLint (Next core-web-vitals).
- DB: `bun run db:migrate`, `bun run db:generate`, `bun run db:studio`.
- Tests: `bunx jest` (watch: `bunx jest --watch`).

## Coding Style & Naming Conventions
- TypeScript strict; 2-space indentation; ESLint enforced.
- Files: kebab-case; React components `PascalCase` in `*.tsx`.
- Variables/functions: `camelCase`; Drizzle columns `snake_case`, mapped to TS `camelCase`.
- Validate inputs with Zod in `src/lib/validations.ts`; respect RBAC guards.

## Testing Guidelines
- Tests live in `src/__tests__` as `*.test.ts`/`*.test.tsx`.
- Focus on services and API routes; mock network/Redis/DB; include timezone (WIB) edge cases.
- Run with `bunx jest`; example: `bunx jest src/__tests__/patients.test.ts`.

## Commit & Pull Request Guidelines
- Commits: imperative, present tense with optional scope (e.g., `feat(reminders): add retry backoff`).
- PRs: include description, linked issues, UI screenshots, migration notes, and test steps.
- Call out cache invalidation (keys touched) and security impact (roles/scopes) when relevant.
- Pre-commit checks: run `bunx tsc --noEmit` and `bun run lint --quiet`; address all errors before commit/push.
- After checks pass: commit and push to `origin main`. Example: `git add -A && git commit -m "feat(reminders): simplify confirmation message" && git push origin main`.

## Security & Configuration Tips
- Secrets in `.env.local` (never commit): `DATABASE_URL`, `REDIS_URL`, `CLERK_*`, `MINIO_*`, `FONNTE_TOKEN`, `CRON_SECRET`.
- Enforce role checks on server; guard API routes and services; store timestamps in UTC and convert via `src/lib/timezone.ts`.
