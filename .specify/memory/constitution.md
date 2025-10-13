<!--
Sync Impact Report:
Version change: 1.0.0 → 1.1.0 (MINOR: added Bun/TypeScript enforcement principles)
List of modified principles: N/A (no principles removed, but renumbered due to additions)
Added sections: Principle VI (Bun-Exclusive Package Management), Principle VII (TypeScript-Only File Structure), Governance Enforcement section
Removed sections: N/A
Templates requiring updates: ✅ plan-template.md (no changes needed), ✅ spec-template.md (no changes needed), ✅ tasks-template.md (no changes needed), ✅ PowerShell scripts (no violations found)
Follow-up TODOs: None
-->

# PRIMA Constitution

## Core Principles

### I. Patient-Centered Design
All features must prioritize patient safety, privacy, and experience. The system exists to serve Indonesian cancer patients and healthcare volunteers. Every design decision must consider the impact on patients, including elderly users with limited technical literacy. WhatsApp communication must be simple, clear, and culturally appropriate for Indonesian context.

### II. Data Privacy and Compliance
Patient data protection is non-negotiable. All sensitive health information must be encrypted at rest and in transit. Access to patient records requires proper authentication and authorization logging. The system must comply with Indonesian healthcare data regulations and implement soft-delete patterns for data retention. No patient data should be exposed in logs or error messages.

### III. Reliability and Redundancy
WhatsApp reminders are critical for patient medication compliance. The message queue system must handle failures gracefully with exponential backoff retry logic. All scheduled tasks must be idempotent and resilient to interruptions. Critical operations (reminder sending, compliance tracking) must have audit trails. System downtime must not impact patient medication schedules.

### IV. WIB Timezone Integrity
All scheduling and timestamps must use WIB (UTC+7) timezone consistently. Database stores UTC timestamps, but all user-facing displays, scheduling logic, and reminder times must convert to WIB. Reminder scheduling must use exact minute matching for precise delivery times. Timezone conversion logic must be centralized and tested thoroughly.

### V. Service Layer Architecture
Business logic must be organized in domain-specific services under `src/services/`. Each service handles a single responsibility (patients, reminders, WhatsApp, LLM, etc.). Services must be loosely coupled with well-defined interfaces. Database operations go through services, never directly from API routes. This ensures maintainability and testability across the 16-table schema.

### VI. Bun-Exclusive Package Management
Bun is the ONLY allowed package manager and runtime - strictly non-negotiable. All commands must use `bun` or `bunx` exclusively. Never use npm, yarn, pnpm, or any other package manager. All scripts, tooling, and CI/CD pipelines must enforce Bun usage. This includes dependency installation, script execution, testing, and build processes. Violations are immediate blockers for any code changes.

### VII. TypeScript-Only File Structure
All source code must use `.ts` file extensions exclusively - no `.cjs`, `.mjs`, `.js`, or other JavaScript variants allowed. Configuration files must use TypeScript when supported by the tool. Legacy JavaScript files must be converted to TypeScript before any modifications. All TypeScript files must use strict mode with proper type annotations. This ensures type safety across the entire codebase in a healthcare context where reliability is critical.

### VIII. Type Safety and Validation
TypeScript strict mode is mandatory - no `any` types allowed. All API endpoints must use Zod schemas for input validation and response typing. Database operations must use Drizzle schema types. Explicit return types required for all functions. This prevents runtime errors in a healthcare context where reliability is critical.

### IX. Performance with Caching
Redis caching is essential for system performance. Frequently accessed data (patients, stats, templates, user sessions) must be cached with appropriate TTL values. Cache invalidation must occur immediately after data mutations. Database queries should use proper indexes. Message queue processing must be efficient to handle WhatsApp volume.

## Healthcare Compliance

### Medical Communication Boundaries
PRIMA is a compliance tracking system, not a medical advice platform. Never provide medical recommendations or dosage adjustments. Always direct patients to healthcare professionals for medical questions. Emergency situations should alert volunteers but PRIMA is not an emergency service. All message templates must be reviewed for appropriate medical communication boundaries.

### Indonesian Healthcare Standards
System must align with Indonesian healthcare practices and regulations. Patient communication should use appropriate formal/informal language based on cultural context. Phone number validation must handle Indonesian formats correctly. All user interfaces should support Indonesian language where appropriate. System design must consider infrastructure limitations in Indonesian healthcare settings.

## Development Workflow

### Code Quality Gates
All code changes must pass TypeScript compilation (`bunx tsc --noEmit`) and ESLint (`bun run lint`). No test framework is configured - rely on type checking and linting for quality assurance. Code reviews must verify compliance with service layer architecture and authentication patterns. Database migrations must be reviewed for data safety.

### Import and Style Standards
Always use absolute imports with `@/` prefix - never relative imports. Follow naming conventions: camelCase for variables/functions, PascalCase for components/types, UPPER_SNAKE_CASE for constants. Use `@/lib/logger` for logging, never `console.*`. API responses must use standardized wrappers from `@/lib/api/api-response.ts`.

### Package Management
Bun is the ONLY allowed package manager - strictly enforced, non-negotiable. All package operations, scripts, and tooling must use `bun` or `bunx` exclusively. Any detection of npm, yarn, pnpm, or other package managers in scripts, dependencies, or tooling is an immediate violation requiring correction. All development scripts, CI/CD pipelines, and documentation must reference only Bun commands.

## Governance

This constitution supersedes all other development practices and documentation. Amendments require version increment according to semantic versioning rules:

- **MAJOR**: Backward incompatible changes to core principles or governance structure
- **MINOR**: New principles or substantial expansion of existing guidance
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

All pull requests must verify compliance with relevant constitution sections. Complexity beyond established patterns must be explicitly justified. Use CLAUDE.md for runtime development guidance that may change frequently.

### Enforcement and Violations

- **Bun/TypeScript violations are immediate blockers**: Any detection of npm, yarn, pnpm, `.cjs`, `.mjs`, `.js` files, or non-TypeScript configurations must be corrected before merge
- **Zero-tolerance policy**: Package manager or file type violations cannot be justified by complexity or legacy constraints
- **Automated validation**: All CI/CD pipelines must enforce Bun-only usage and TypeScript-only file structure
- **Code review requirements**: Reviewers must explicitly verify compliance with Principles VI (Bun-Exclusive) and VII (TypeScript-Only)

Constitution violations must be documented with rationale and simpler alternatives considered. In healthcare contexts, patient safety and compliance considerations may justify additional complexity, but never justify Bun/TypeScript violations.

**Version**: 1.1.0 | **Ratified**: 2025-01-13 | **Last Amended**: 2025-10-13