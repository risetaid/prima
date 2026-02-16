# Architecture Patterns

## Primary Pattern

The repository follows a **layered Next.js monolith** pattern:

1. `src/app/**` handles UI routes and API route entrypoints.
2. `src/services/**` contains business logic orchestration.
3. `src/db/**` defines schema and data-layer contracts.
4. `src/lib/**` provides shared utilities, auth helpers, and cross-cutting concerns.
5. `src/components/**` organizes reusable and feature-level UI.

## Supporting Patterns

- **Route handler pattern:** API handlers in `src/app/api/**/route.ts`.
- **Service + repository pattern:** service modules under `src/services/*` with data-oriented modules such as `patient.repository.ts`.
- **Schema-first persistence:** Drizzle schema in `src/db/schema.ts` plus SQL migrations in `drizzle/migrations`.
- **Context-based client state:** `AuthProvider` and app-level providers instead of Redux-style global store.
- **Feature-oriented UI grouping:** domain folders (`admin`, `patient`, `pengingat`, `cms`) plus `ui` primitives.
