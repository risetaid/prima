# PRIMA Constitution

## Core Principles

### I. Bun-Only Tooling

All package management, scripts, and workflows MUST use Bun. npm, yarn, and pnpm are strictly prohibited. All developer instructions, CI, and automation must invoke Bun commands only.

### II. API-Service Separation

API routes MUST be thin controllers, delegating all business logic to service modules. No business logic is allowed in API route files. All validation must use Zod schemas. Error handling must be centralized and structured.

### III. Test-First (NON-NEGOTIABLE)

All new features and bug fixes MUST be developed using TDD. Tests are written and must fail before implementation. Red-Green-Refactor is strictly enforced. All features must be independently testable and deployable.

### IV. Integration and Contract Testing

Integration tests are required for all new service contracts, API endpoints, and inter-service communication. Contract changes require new or updated tests. Shared schemas must be validated across boundaries.

### V. Observability and Simplicity

All code must be observable: structured logging is required, and errors must be traceable. Simplicity is prioritized: avoid over-engineering, follow YAGNI, and keep interfaces minimal. Versioning follows MAJOR.MINOR.PATCH, with breaking changes requiring a major version bump.

## Technology & Compliance Constraints

- Only Bun is allowed for all package management and scripts.
- Drizzle ORM is required for all database access.
- Clerk is required for authentication; Fonnte for WhatsApp integration.
- All validation must use Zod.
- All environment variables must be documented in PRs.
- All code must be TypeScript (no JavaScript in src/).
- All migrations must be tracked in drizzle/migrations/ and never rewritten retroactively.

## Development Workflow & Quality Gates

- All code changes require PR review.
- All PRs must pass tests (`bun test`), type checks (`bunx tsc --noEmit`), and lint (`bun run lint`).
- New features must include or update tests and documentation.
- DB schema changes require a migration and schema update.
- Multi-layer features must include a docs/ note if runtime impact exists.
- All code must be independently testable and deployable.

## Governance

- This constitution supersedes all other project practices and conventions.
- Amendments require PR, documentation, and a migration/transition plan if breaking.
- All PRs and reviews must verify compliance with these principles and constraints.
- Versioning: MAJOR for breaking/removal, MINOR for new principles/sections, PATCH for clarifications.
- Compliance is reviewed at every release and before major launches.
- Use README.md and docs/ for runtime and onboarding guidance.

<!--
Sync Impact Report
- Version change: 0.0.0 → 1.0.0
- Modified principles: all placeholders replaced with concrete project rules
- Added sections: Technology & Compliance Constraints, Development Workflow & Quality Gates
- Removed sections: none
- Templates requiring updates: plan-template.md (✅), spec-template.md (✅), tasks-template.md (✅)
- Follow-up TODOs: TODO(RATIFICATION_DATE): Set original ratification date if known
-->

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Set original ratification date if known | **Last Amended**: 2025-10-14
