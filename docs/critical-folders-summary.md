# Critical Folders Summary

## `src/app`

- Purpose: App Router pages and server route handlers.
- Contains: UI pages, API route files, route-level layouts.
- Entry points: `src/app/layout.tsx`, `src/app/api/**/route.ts`.

## `src/components`

- Purpose: Shared and feature-specific UI composition.
- Contains: UI primitives, domain components, provider wrappers.

## `src/services`

- Purpose: Business logic and orchestration.
- Contains: patient, reminder, AI, verification, and messaging services.

## `src/db`

- Purpose: Database schema and migration definitions.
- Contains: schema modules, enums, SQL migration scripts.

## `src/lib`

- Purpose: Cross-cutting utilities and platform helpers.
- Contains: auth helpers, caching, validation, analytics, retry/recovery tools.

## `drizzle/migrations`

- Purpose: Generated migration SQL and migration metadata snapshots.
- Contains: numbered SQL migration files and `meta` snapshots.

## `tests`

- Purpose: Verification across app/API/db and comprehensive scenarios.
- Contains: endpoint tests, lib tests, comprehensive suite runner/reporters.

## `scripts`

- Purpose: Operational and migration support automation.
- Contains: index optimization, setup scripts, worker startup, migration scripts.
