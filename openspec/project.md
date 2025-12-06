# Project Context

## Purpose

PRIMA (Patient Reminder and Information Management Application) is a modern healthcare platform designed for:

- **Patient Management**: Track patients with cancer diagnoses, including staging, medical records, and volunteer assignments
- **Automated Reminders**: WhatsApp-based medication and appointment reminders with AI-powered confirmation handling
- **Educational Content**: CMS for managing health articles (berita) and YouTube video content
- **Volunteer Coordination**: Role-based system for volunteers (RELAWAN), admins, and developers to manage patient care

## Tech Stack

### Core Framework

- **Next.js 15** (App Router with Turbopack for dev)
- **React 19**
- **TypeScript 5** (strict mode enabled)
- **Bun** (package manager & runtime — not npm/yarn)

### Database & ORM

- **PostgreSQL** (Neon recommended for hosting)
- **Drizzle ORM** for type-safe queries and schema management
- **Redis** (via ioredis) for rate limiting and caching

### Authentication & Security

- **Clerk** for authentication (middleware-protected routes)
- Internal API key support for testing/service calls

### Messaging & Communication

- **WAHA** (WhatsApp HTTP API) for WhatsApp messaging
- Webhook handlers for incoming messages and delivery status

### AI Services

- **Anthropic Claude** (@anthropic-ai/sdk) for AI-powered conversation handling and intent recognition

### UI Components

- **Tailwind CSS 4**
- **shadcn/ui** (Radix UI primitives)
- **Lucide React** (icons)

### Validation & Error Handling

- **Zod** for runtime validation and API schema definitions

### Testing

- **Vitest** for unit tests
- Custom comprehensive test suite with load testing capabilities

### File Storage

- **MinIO** for object storage (patient photos, uploads)

## Project Conventions

### Code Style

- **TypeScript strict mode** is mandatory — run `bunx tsc --noEmit` before commits
- **ESLint** with Next.js config; `@typescript-eslint/no-explicit-any` is an error
- **Prefer `unknown` + Zod validation** at API boundaries instead of `any`
- Use **explicit return types** for exported functions (services, repository methods)
- Path aliases: `@/*` maps to `./src/*`

### Architecture Patterns

#### Layered Architecture

```
src/app/api/*     → Thin Controllers (validate → delegate → respond)
src/services/*    → Business Logic (domain rules, orchestration)
src/db/*          → Data Access (Drizzle schemas, queries)
src/lib/*         → Shared Utilities (validation, helpers, clients)
```

#### API Route Pattern

- Keep route handlers minimal: validate input with Zod, call service, return response
- Zod schemas live in `src/lib/api-schemas.ts`
- Error handling via `src/lib/error-handler.ts`

#### Database Schema Organization

- Enums: `src/db/enums.ts`
- Core tables (users, patients, medical records): `src/db/core-schema.ts`
- Reminder tables: `src/db/reminder-schema.ts`
- Content tables: `src/db/content-schema.ts`
- Relations: `src/db/schema.ts`
- Migrations: `drizzle/migrations/`

### Testing Strategy

#### Unit Tests

- Located in `tests/` directory
- Run with `bun test` (Vitest)

#### Comprehensive System Tests

- Located in `tests/comprehensive-suite/`
- Categories: auth, reminder, whatsapp, content, load
- Run with `bun run test:comprehensive` or specific category commands
- Generates HTML reports with performance metrics

#### Pre-commit Validation

- Run `bun run precommit` (lint + typecheck) before every commit

### Git Workflow

#### Commit Convention

Follow **Conventional Commits v1.0.0**:

```
<type>(optional-scope): <short description>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting/whitespace
- `refactor`: Code changes without new features
- `perf`: Performance improvements
- `test`: Tests only
- `build`: Build or dependency changes
- `ci`: CI config changes
- `chore`: Other maintenance
- `wip`: Work in progress

#### PR Workflow

- Use `gh` CLI for PR operations
- Use draft PRs for WIP code
- Database schema changes require migration files in `drizzle/migrations/`

## Domain Context

### User Roles

- **ADMIN**: Full system access, user approval, patient management
- **DEVELOPER**: System administration and debugging capabilities
- **RELAWAN** (Volunteer): Patient care, reminders, confirmations

### Patient Journey

1. Patient registered with contact info and cancer diagnosis
2. Volunteer assigned to patient
3. Reminders scheduled (medication, appointments)
4. WhatsApp messages sent automatically
5. AI handles responses for confirmation/rescheduling
6. Manual confirmation available for missed responses

### Reminder Workflow

- **Statuses**: PENDING → SENT → DELIVERED or FAILED
- **Confirmation**: PENDING → CONFIRMED or MISSED
- **Types**: MEDICATION, APPOINTMENT, GENERAL

### Content Management

- CMS articles (berita) with rich text editing
- YouTube video integration for educational content
- Content categories: GENERAL, NUTRITION, EXERCISE, MOTIVATIONAL, MEDICAL, FAQ

## Important Constraints

### Technical

- **Bun only** — do not use npm or yarn
- **Strict TypeScript** — no `any` in production code
- **Idempotency required** for webhook handlers (WhatsApp delivery can retry)
- **Rate limiting** on API endpoints to prevent abuse

### Security

- Never commit credentials — use `.env.local` for local development
- Clerk handles authentication; check middleware when adding protected routes
- Internal API key validation for testing/service-to-service calls

### Healthcare Compliance

- Patient data must be handled with privacy in mind
- Medical text may contain special characters (allow unescaped entities)
- Audit trails for patient interactions

## External Dependencies

### Required Services

| Service             | Purpose                | Env Vars                                        |
| ------------------- | ---------------------- | ----------------------------------------------- |
| **Clerk**           | Authentication         | `CLERK_*`                                       |
| **PostgreSQL/Neon** | Database               | `DATABASE_URL`                                  |
| **WAHA**            | WhatsApp messaging     | `WAHA_API_KEY`, `WAHA_ENDPOINT`, `WAHA_SESSION` |
| **Redis**           | Rate limiting, caching | `REDIS_URL`                                     |
| **MinIO**           | File storage           | `MINIO_*`                                       |
| **Anthropic**       | AI conversations       | `ANTHROPIC_API_KEY`                             |
| **YouTube**         | Video content          | `YOUTUBE_API_KEY`                               |

### Key Integrations

- **WhatsApp Webhooks**: `src/app/api/webhooks/waha/route.ts`
- **AI Services**: `src/services/ai/*`
- **File Upload**: `src/app/api/upload/*`

## Common Commands Reference

```bash
# Development
bun install              # Install dependencies
bun dev                  # Start dev server (Turbopack)

# Database
bunx drizzle-kit generate   # Generate migrations
bunx drizzle-kit push       # Push schema to DB
bunx drizzle-kit studio     # Open Drizzle Studio

# Testing
bun test                    # Unit tests
bun run test:comprehensive  # Full test suite
bun run test:auth           # Auth tests only

# Quality
bun run lint                # ESLint
bunx tsc --noEmit           # Type check
bun run precommit           # Lint + typecheck (run before commits)

# Production
bun build                   # Build for production
bun start                   # Start production server
```
