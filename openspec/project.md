# Project Context

## Purpose

PRIMA is a healthcare-oriented Next.js web application for managing patient data, reminders, volunteer workflows, and clinical content. Its goals are to:

- Provide a secure admin and volunteer-facing interface for patient case management.
- Manage reminders/notifications and scheduled messages to patients and volunteers.
- Host and manage clinical content (articles, education videos) for patients and staff.
- Provide exportable PDF reports (patient lists, volunteer reports) and administrative tooling.

## Tech Stack

- Frontend: Next.js 15 (React 19) with TypeScript and Tailwind CSS for styling.
- Backend / Fullstack: Next.js server routes + Node.js runtime (in Next.js pages/api or app router API handlers).
- Database: PostgreSQL accessed via Drizzle ORM (drizzle-orm + drizzle-kit migrations).
- Auth: Clerk (`@clerk/nextjs`) for authentication and user management.
- Messaging / Queue: ioredis + custom worker scripts (see `scripts/start-message-worker.ts`).
- Storage: MinIO-compatible object storage (via `minio` package) for file uploads.
- External services: Svix for webhooks, Anthropic SDK for AI features, and other integrations listed in `package.json`.
- Dev tooling: TypeScript, ESLint (Next.js ESLint config), Tailwind, drizzle-kit. This project uses `bun` exclusively as the package manager and script runner. All developer instructions and scripts assume `bun` is available and in PATH — do not use npm, yarn, or pnpm.

## Project Conventions

### Code Style

- Language: TypeScript (repository uses `type: module`) and React (server + client components in Next.js app router).
- - Formatting: Follow the project's existing ESLint and Tailwind conventions. Run lint tooling via `bun run lint` (project uses Next's `next lint`).
- Files & naming: React components in `src/components/` grouped by domain (e.g., `patient`, `reminder`, `cms`). Pages live under `src/app/` following Next.js app-router conventions.
- Server vs Client components: Prefer server components for data-heavy pages and only opt into client components (`"use client"`) when interactivity is required.
- Schemas: Use Zod for runtime validation (`zod`) and keep API input validation near handlers.

### Architecture Patterns

- Monorepo-style single Next.js app with clear domains under `src/` (e.g., `cms`, `dashboard`, `pasien`, `pengingat`).
- Database access centralized in `db/` using Drizzle ORM. Migration scripts live in `drizzle/migrations` and `db/migrations`.
- Background jobs and scripts in `scripts/` for maintenance tasks and workers. Use Redis for queue/state (via `ioredis`) where necessary.
- API surface: prefer small, focused API handlers under `src/app/api` (or `src/api` if present). Keep handlers idempotent and validated.

### Testing Strategy

- Unit & integration: Prefer lightweight unit tests for business logic (hooks, helpers). The repository currently has no test runner configured; add tests with Jest or Vitest if/when required.
- Manual QA: Use local dev `bun run dev` and run scripts to validate migrations and background workers.
- DB migrations: Use `bun run drizzle-kit migrate` and keep migrations under source control. Use `bun run db:generate` to regenerate schema artifacts.

### Linting and Type Checking

- Lint: `bun run lint` (uses Next.js ESLint rules). Ensure changes pass `next lint` before PR.
- Typecheck: `bun run typecheck` (runs `tsc --noEmit`). Keep TypeScript strictness reasonable; follow existing `tsconfig.json`.

### Scripts and Common Commands (bun-only)

- Development server: `bun run dev` (alias `dev:next`).
- Build: `bun run build` (use `build:analyze` or `build:profile` for debugging bundle sizes).
- Start production server: `bun run start`.
- Database helper scripts (run via bun):
  - `bun run db:generate` — generate Drizzle artifacts
  - `bun run db:migrate` — run migrations
  - `bun run db:push` — push schema (force)
  - `bun run db:studio` — open drizzle studio
  - `bun run db:apply-indexes` — run apply-indexes script
- Maintenance scripts: `bun run nuke-recreate-db`, `bun run setup-first-user`, `bun run start-message-worker`.

### Git Workflow

- Branching: Use feature branches named as `feat/<short-desc>`, bugfixes as `fix/<short-desc>`, and refactors as `refactor/<scope>`.
- Commits: Use conventional commits (e.g., `feat: add patient export`, `fix: correct reminder cron`). Keep messages clear and reference issue/PR when applicable.
- Pull Requests: Create PRs against `main`. Include a brief description, screenshot or recording if UI changes, and list of files changed. Link any related `openspec/changes/*` proposal if the change came from a spec.

## Domain Context

- Primary domain: patient management and volunteer operations. Key concepts:
  - Patient (`pasien`): personal and clinical data stored in `uploads/patients` and DB tables defined in `db/`.
  - Reminder (`pengingat` / reminders): scheduled notifications to patients or volunteers, managed in `src/pengingat` and `db/reminder-schema.ts`.
  - Volunteers and admin: user roles provided by Clerk; volunteer workflows exist under `src/volunteer` and `src/dashboard`.
  - CMS content: `src/cms` and `src/berita` host content pages and editorial flows.

## Important Constraints

- Privacy & Security: The app handles personal health information (PHI/PII). Ensure environment secrets are never committed. Follow least-privilege access for storage and database.
- Auth: Clerk manages authentication. Maintain role checks server-side—never rely on client-only checks.
- Backwards compatibility: Database migrations must be additive where possible. Use `drizzle-kit` migrations and include migration SQL in `drizzle/migrations`.
- Runtime: The project targets Node.js runtime used by Next.js; ensure server-side code is compatible with the selected Next.js version.

## External Dependencies

- Clerk (`@clerk/nextjs`) — authentication and user identity.
- Drizzle ORM / drizzle-kit — database access and migrations.
- Postgres — primary data store.
- MinIO — object storage for uploads.
- Redis (ioredis) — caching and possibly job queues.
- Svix — webhook delivery.
- Anthropic SDK — AI features.

## Contribution Guidelines (short)

- Run linters and typecheck locally: `bun run lint` and `bun run typecheck`.
- Run dev server: `bun run dev`.
- Write a small `tasks.md` and `proposal.md` under `openspec/changes/<change-id>/` for non-trivial feature or breaking changes and follow the OpenSpec workflow in `openspec/AGENTS.md`.
- Include migration files for DB changes and add tests where feasible.

## Notes for AI Assistants

- Always read `openspec/project.md` (this file) and `openspec/AGENTS.md` before proposing changes.
- When creating change proposals, follow the three-stage workflow in `openspec/AGENTS.md`.
- Preserve privacy: do not output real patient data. Mask or synthesize any examples involving PII.

---

If you'd like, I can also:

- Add a minimal `CONTRIBUTING.md` or PR template.
- Add a short checklist to `package.json` scripts for CI (lint, typecheck, build).
