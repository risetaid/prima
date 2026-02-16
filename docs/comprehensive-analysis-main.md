# Comprehensive Analysis (main)

## Configuration Management

- Primary config files: `next.config.ts`, `drizzle.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`, `bunfig.toml`.
- Environment loading expected via `.env` and runtime environment variables.

## Authentication and Security Patterns

- Clerk-based authentication with route protection (`src/middleware.ts`).
- API protection includes route matching and internal API key checks.
- Security helpers exist under `src/lib/auth-utils.ts`, `src/lib/webhook-auth.ts`, and related auth context modules.

## Entry Points

- App shell entry: `src/app/layout.tsx`.
- API route entry points: `src/app/api/**/route.ts`.
- Build/runtime entry configuration: `next.config.ts`.

## Shared Code Patterns

- Shared utility modules concentrated in `src/lib/**`.
- Domain services grouped in `src/services/**`.
- Shared type and helper usage through alias imports (`@/*` path mapping).

## Async and Event-Oriented Patterns

- Worker-related script: `scripts/start-message-worker.ts`.
- Reliability primitives: caching, retry, circuit breaker, and idempotency helpers in `src/lib/**`.

## CI/CD and Deployment Signals

- No explicit CI/CD pipeline files detected in repository root patterns.
- Next.js standalone output is enabled, indicating container/deployment optimization intent.

## Localization and Assets

- No dedicated localization directory pattern detected.
- Static assets are present under `public/` (icons, uploads).
