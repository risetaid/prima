# prima-system - Source Tree Analysis

**Date:** 2026-02-16

## Overview

Single-repository Next.js monolith with co-located frontend routes, server API handlers, services, database schema, and operational scripts.

## Annotated Directory Structure

```text
prima/
├── src/
│   ├── app/                  # Next.js App Router pages + API route handlers
│   │   ├── api/              # REST-style endpoints (route.ts files)
│   │   ├── admin/            # Admin pages
│   │   ├── pasien/           # Patient-facing management pages
│   │   ├── pengingat/        # Reminder feature pages
│   │   └── layout.tsx        # Global app shell entry point
│   ├── components/           # Reusable UI and feature components
│   │   ├── ui/               # UI primitives (buttons, forms, dialogs, etc.)
│   │   ├── patient/          # Patient feature components
│   │   ├── admin/            # Admin feature components
│   │   └── providers/        # App provider composition
│   ├── services/             # Business/service layer modules
│   ├── db/                   # Drizzle schema and SQL migration scripts
│   ├── lib/                  # Shared helpers, auth, caching, utility modules
│   ├── middleware/           # Middleware-related modules
│   └── middleware.ts         # Request auth/security middleware entry
├── drizzle/migrations/       # Drizzle generated SQL migrations and snapshots
├── scripts/                  # Maintenance, migration, and ops scripts
├── tests/                    # Unit/integration/comprehensive test suites
├── public/                   # Static assets and uploads
├── _bmad/                    # BMAD workflow and agent definitions
└── package.json              # Dependency and script manifest
```

## Entry Points

- `src/app/layout.tsx` (application shell)
- `src/app/api/**/route.ts` (backend endpoints)
- `src/middleware.ts` (request middleware chain)
- `next.config.ts` (runtime/build behavior)

## File Organization Patterns

- Feature-oriented app routes and components.
- Service + repository split for domain operations.
- Schema and SQL migrations versioned in dedicated DB folders.
- Utility-heavy shared layer in `src/lib` for cross-cutting concerns.
