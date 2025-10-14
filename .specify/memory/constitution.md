<!-- Sync Impact Report
Version change: N/A → 1.0.0
List of modified principles: N/A (all new)
Added sections: All
Removed sections: None
Templates requiring updates: .specify/templates/plan-template.md (✅ updated), .specify/templates/spec-template.md (✅ updated), .specify/templates/tasks-template.md (✅ updated)
Follow-up TODOs: None
-->

# PRIMA Constitution

## Core Principles

### I. Next.js App Router Architecture

The application uses Next.js with App Router for frontend, with server and client components. Pages live under src/app/_ and API routes under src/app/api/_. Business logic lives in src/services/ and reusable code in src/lib/.

### II. Drizzle ORM Database Management

Database schemas and migrations are in db/ and drizzle/. Drizzle ORM is used throughout. When changing schema, update Drizzle migrations and run drizzle-kit push.

### III. Clerk Authentication

Clerk is used for authentication; environment secrets live in .env.local with CLERK* prefixes. Look for CLERK* prefixes.

### IV. Bun Package Manager

Project uses Bun (not npm/pnpm/yarn). Prefer Bun-specific commands and bunx for CLI tools. Install: bun install, Dev: bun dev, Build: bun build then bun start, Tests: bun test, Typecheck: bunx tsc --noEmit, Lint: bun run lint.

### V. Zod Validation and Vitest Testing

Zod is the primary validation library. Look for zod imports in src/ and lib/api-schemas.ts. Vitest is used for tests; tests live under tests/ (or alongside code). Use bun test and prefer small, focused tests.

## Additional Constraints

Technology stack requirements: Next.js, Drizzle ORM, Clerk auth, Bun package manager, Zod validation, Vitest testing, Fonnte for WhatsApp integration, YouTube Data API. Compliance standards: Central error handling at src/app/global-error.tsx and helpers in src/lib/error-handling. Security: Environment variables for secrets (CLERK*\*, FONNTE*\*, YOUTUBE_API_KEY). Performance: No specific standards defined yet.

## Development Workflow

Code review requirements: Include environment impacts in PR description. When changing DB schema, add migration under drizzle/migrations/ and update db/ schema files. For feature changes touching multiple layers, include a short README or docs/ note describing runtime impact and any manual steps. Testing gates: Run bun test, bunx tsc --noEmit, bun run lint before PR. Deployment approval: No specific process defined yet.

## Governance

Constitution supersedes all other practices; Amendments require documentation, approval, migration plan. All PRs/reviews must verify compliance; Complexity must be justified; Use copilot instructions for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2025-10-14 | **Last Amended**: 2025-10-14
