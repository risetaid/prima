# prima-system Architecture

**Date:** 2026-02-16
**Scan mode:** quick
**Project type:** web monolith

## Executive Summary

`prima-system` is a Next.js App Router healthcare platform that combines patient management, reminder scheduling, content/CMS features, and operational admin tooling in a single repository. The codebase uses layered boundaries: route handlers in `src/app`, business logic in `src/services`, schema/data contracts in `src/db`, and cross-cutting utilities in `src/lib`.

## Technology Stack

| Category | Technology | Version |
| --- | --- | --- |
| Framework | Next.js | ^15.4.10 |
| UI | React | 19.1.1 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Auth | Clerk | ^6.31.6 |
| ORM | Drizzle ORM | ^0.33.0 |
| Database | PostgreSQL | via `postgres` ^3.4.4 |
| Cache/Queue | Redis (`ioredis`) | ^5.7.0 |
| Validation | Zod | ^4.0.17 |
| Testing | Vitest + Testing Library | ^3.2.4 + ^16.3.0 |

## Architecture Pattern

### High-Level Flow

1. UI pages and route segments render through App Router in `src/app`.
2. API handlers under `src/app/api/**/route.ts` accept requests.
3. Handlers delegate domain operations to `src/services/**`.
4. Services rely on `src/db/**` schema/data modules and `src/lib/**` helpers.
5. Middleware (`src/middleware.ts`) enforces auth/security checks before route execution.

### Pattern Characteristics

- Layered monolith with feature-oriented foldering.
- Service/repository split for data-heavy domains (patient/reminder).
- Migration-first schema management via Drizzle.
- Context/provider client state instead of heavy global store frameworks.

## Data Architecture

- Schema modules: `src/db/core-schema.ts`, `src/db/reminder-schema.ts`, `src/db/content-schema.ts`, assembled through `src/db/schema.ts`.
- Migration system: `drizzle/migrations` and `src/db/migrations`.
- DB config and dialect are defined in `drizzle.config.ts`.

## API Design

- API surface is organized by domain paths:
  - health/system
  - auth/user
  - patients/reminders
  - cms/content
  - admin
  - webhooks/debug
- Route handlers are standardized as `route.ts` files in nested folder paths.

## Component Overview

- Shared primitives in `src/components/ui`.
- Feature components grouped by domain (`admin`, `patient`, `pengingat`, `reminder`, `cms`, etc.).
- App-level provider composition in `src/components/providers/app-providers.tsx`.

## Source Tree Highlights

- `src/app` - pages, route handlers, route-specific layouts.
- `src/components` - reusable and feature UI modules.
- `src/services` - domain workflows.
- `src/db` - data models and migrations.
- `src/lib` - shared utilities and reliability helpers.
- `scripts` - maintenance and migration operations.

## Development Workflow

- Install: `bun install`
- Run dev: `bun dev`
- Build/start: `bun build` / `bun start`
- DB: `bun run db:generate`, `bun run db:migrate`, `bun run db:push`
- Quality: `bun run lint`, `bunx tsc --noEmit`, `bun run test:comprehensive`

## Deployment Architecture

- Next.js standalone output is enabled.
- PWA wrapper is configured.
- Explicit container/IaC pipeline files were not detected in quick scan.

## Testing Strategy Signals

- Unit/integration tests under `tests/`.
- Additional comprehensive suite under `tests/comprehensive-suite`.
- API-focused tests present under `tests/app/api/**`.

## Constraints and Notes

- This quick scan prioritizes structural certainty over endpoint/schema deep extraction.
- For strict API method contracts and field-level data models, run deep or exhaustive mode.
