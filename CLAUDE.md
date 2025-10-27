# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

## Project Overview

**PRIMA** (Patient Reminder and Information Management Application) is a modern healthcare platform for managing patient reminders, medical information, and WhatsApp integration. Built with Next.js 15 (App Router), TypeScript, Drizzle ORM, and Clerk authentication.

**Key Principles**: Bun-only, TDD, API/service separation, type-safety first, spec-driven development.

---

## Essential Commands

### Development

```bash
bun install              # Install dependencies
bun dev                  # Start dev server (with Turbopack)
bun run build            # Production build
bun start                # Run production server
bun run lint             # ESLint check
bun run typecheck        # TypeScript check
bun test                 # Run Vitest tests
```

### Database (Drizzle ORM)

```bash
bunx drizzle-kit generate    # Generate new migrations from schema changes
bunx drizzle-kit push        # Apply migrations to database
bunx drizzle-kit studio      # Visual DB editor
bun run nuke-recreate-db     # Full database reset
```

### Single Test Execution

```bash
bun test [filename]          # Run specific test file
```

---

## Architecture Overview

### Layered Service Pattern

The codebase follows a **strict three-layer architecture**:

1. **API Controllers** (`src/app/api/`) — Thin route handlers

   - Parse input, validate with Zod schemas
   - Delegate to service layer
   - Return formatted responses

2. **Service Layer** (`src/services/`) — Business logic

   - Domain-specific services with methods
   - Repository pattern for data access
   - Type definitions per service
   - Error handling and validation

3. **Data Layer** (`src/db/`) — Drizzle ORM
   - Schema definitions (Postgres)
   - Type-safe queries
   - Migrations under `drizzle/`

**Example**: `src/app/api/reminders/[id]` → `ReminderService` → `ReminderRepository` → database

### Directory Structure

```
src/
├── app/              # Next.js routes + API (thin controllers)
├── services/         # Business logic (15+ services)
├── lib/              # Utilities & helpers (35+ modules)
├── components/       # React UI (organized by domain)
├── db/               # Drizzle schemas & types
├── hooks/            # Custom React hooks
├── middleware.ts     # Clerk auth middleware
└── types.ts          # Global TypeScript definitions

db/                  # Schema files (core, reminder, content)
drizzle/             # Auto-generated SQL migrations
scripts/             # Maintenance & setup utilities
openspec/            # Spec-driven development
```

### Key Technologies

| Layer             | Tech                                          | Purpose                        |
| ----------------- | --------------------------------------------- | ------------------------------ |
| **Frontend**      | Next.js 15 (App Router), React 19, TypeScript | Server & client-side rendering |
| **Styling**       | Tailwind CSS 4, Shadcn/ui, Radix UI           | Responsive UI components       |
| **Database**      | PostgreSQL (Neon), Drizzle ORM                | Type-safe data layer           |
| **Auth**          | Clerk 6.31                                    | User authentication & roles    |
| **Validation**    | Zod 4.0                                       | Runtime schema validation      |
| **Form Handling** | React Hook Form 7.62                          | Efficient form state           |
| **WhatsApp**      | WAHA (WhatsApp HTTP API)                      | Message delivery & webhooks    |
| **Caching**       | Redis (ioredis)                               | Sessions & rate limiting       |
| **File Storage**  | MinIO                                         | S3-compatible object storage   |
| **AI**            | Anthropic SDK 0.63                            | Claude integration             |
| **Testing**       | Vitest                                        | Unit tests                     |
| **Notifications** | Sonner                                        | Toast UI                       |

---

## Code Conventions

### API Routes → Service Delegation

**DON'T** put business logic in route handlers. Always delegate to services.

```typescript
// src/app/api/reminders/route.ts (THIN CONTROLLER)
export async function POST(req: Request) {
  const body = CreateReminderSchema.parse(await req.json());
  const reminder = await reminderService.create(body);
  return Response.json(reminder);
}

// src/services/reminder/reminder.service.ts (BUSINESS LOGIC)
export class ReminderService {
  async create(input: CreateReminderInput) {
    // Validation, domain logic, error handling
    const saved = await this.repository.insert(input);
    return saved;
  }
}
```

### Validation with Zod

All API inputs validated with Zod schemas in `src/lib/api-schemas.ts`:

```typescript
const CreateReminderSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(1, "Title required"),
  scheduledTime: z.string().datetime(),
});

// Use in route
const body = CreateReminderSchema.parse(await req.json());
```

### Error Handling

Use structured error responses. See `src/lib/error-handler.ts`:

```typescript
// Services throw typed errors
throw new ValidationError("Invalid patient ID");
throw new NotFoundError("Reminder not found");

// Routes catch and format
try {
  // ...
} catch (error) {
  return errorHandler(error);
}
```

### Database Access

Always use Drizzle from `src/db/schema.ts`:

```typescript
import { db } from "@/db";
import { reminders, patients } from "@/db/schema";

// Type-safe queries
const reminder = await db
  .select()
  .from(reminders)
  .where(eq(reminders.id, id))
  .limit(1);
```

### Component Organization

Components organized by domain under `src/components/`:

```
src/components/
├── ui/              # Reusable primitives (Button, Card, etc.)
├── admin/           # Admin-specific components
├── patient/         # Patient-related components
├── reminder/        # Reminder workflow UI
└── dashboard/       # Layout components
```

### Authentication & Authorization

- **Middleware**: `src/middleware.ts` protects routes using `clerkMiddleware()`
- **Access Control**: `PatientAccessControl` validates user permissions per service
- **Roles**: RELAWAN (volunteer), ADMIN, DOC
- **Protected Routes**: `/pasien/*`, `/pengingat/*`, `/admin/*` and most API routes

---

## Database Schema Highlights

### Core Tables

| Table                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `users`                | Volunteers & admins (with Clerk sync)                  |
| `patients`             | Cancer patients (phone, verification status)           |
| `reminders`            | Medication/appointment reminders (recurrence patterns) |
| `whatsapp_templates`   | Message templates with variables                       |
| `manual_confirmations` | Volunteer confirmation responses                       |
| `medical_records`      | Patient medical history                                |
| `cms_articles`         | Educational content                                    |
| `conversation_states`  | Multi-turn WhatsApp conversation tracking              |

### Key Relations

- Users → Patients (one-to-many)
- Users → Reminders (assigned reminders)
- Reminders → Patients (one-to-many)
- Reminders → ManualConfirmations (responses)

### Indexes

Strategic indexes on frequent queries:

- `users.clerkId`, `users.role`, `users.isActive`
- `patients.phoneNumber`, `patients.verificationStatus`
- `reminders.patientId`, `reminders.status`, `reminders.scheduledTime`

---

## Important Patterns & Utilities

### Service Pattern Example

```typescript
// File: src/services/reminder/reminder.service.ts
export class ReminderService {
  constructor(
    private repository: ReminderRepository,
    private accessControl: PatientAccessControl
  ) {}

  async create(userId: string, input: CreateReminderInput) {
    await this.accessControl.canManagePatient(userId, input.patientId);
    const reminder = await this.repository.insert(input);
    return reminder;
  }
}
```

### Rate Limiting

`src/lib/rate-limiter.ts` — Token bucket implementation for WhatsApp message limits.

### Idempotency

`src/lib/idempotency.ts` — Prevents duplicate operations via idempotency keys.

### Caching Strategy

Multi-layered:

- Redis for sessions & rate limits
- Response cache for expensive queries
- Client-side browser cache for static data

### Conversation State

`src/services/conversation-state.service.ts` — Manages multi-turn WhatsApp flows:

- Tracks intent extraction
- Manages confirmation workflows
- Persists conversation context

---

## Integration Points

### External Services

| Service               | Use                      | Env Vars                                    |
| --------------------- | ------------------------ | ------------------------------------------- |
| **Clerk**             | User auth & webhooks     | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| **WAHA**              | WhatsApp send & incoming | `WAHA_API_KEY`, `WAHA_ENDPOINT`, `WAHA_SESSION` |
| **YouTube API**       | Video metadata           | `YOUTUBE_API_KEY`                           |
| **MinIO**             | File storage             | `MINIO_*` credentials                       |
| **PostgreSQL** (Neon) | Primary database         | `DATABASE_URL`                              |
| **Redis**             | Caching & sessions       | `REDIS_URL`                                 |
| **Anthropic Claude**  | AI responses             | `ANTHROPIC_API_KEY`                         |

### Webhook Handlers

- **`/api/webhooks/waha/incoming`** — WhatsApp message ingestion
- **`/api/webhooks/clerk`** — Auth events (user created/updated/deleted)

---

## Testing

### Running Tests

```bash
bun test                    # All tests
bun test reminder.test.ts   # Single file
```

### Test Utilities

- `src/lib/reminder-testing.ts` — Mock data and test helpers
- Vitest framework (no Jest)

---

## Build & Deployment

### Next.js Configuration

**Output Mode**: Standalone (optimized for Docker)

- Turbopack enabled for fast dev builds
- PWA support with offline capability
- Image optimization (AVIF/WebP)

### Production Build

```bash
bun run build   # Creates .next/standalone
bun start       # Starts production server
```

---

## Environment Variables

All required in `.env.local`. See `README.md` for the complete list. Critical ones:

- `DATABASE_URL` — PostgreSQL connection
- `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` — Auth
- `FONNTE_API_KEY` & `FONNTE_DEVICE_ID` — WhatsApp
- `YOUTUBE_API_KEY` — Video imports
- `REDIS_URL` — Caching

---

## Common Development Tasks

### Adding a New API Endpoint

1. Create route file under `src/app/api/[feature]/route.ts`
2. Add Zod schema in `src/lib/api-schemas.ts`
3. Implement service method in `src/services/[domain]/`
4. Write tests validating schema and service
5. Document any new environment variables

### Modifying Database Schema

1. Update schema file in `src/db/schema.ts`
2. Run `bunx drizzle-kit generate` to create migration
3. Review generated SQL in `drizzle/migrations/`
4. Run `bunx drizzle-kit push` to apply
5. Update related types and services

### Adding a WhatsApp Message Handler

1. Add conversation flow logic in `conversation-state.service.ts`
2. Update webhook handler at `/api/webhooks/waha/incoming`
3. Add WAHA API call via `src/lib/waha.ts`
4. Test with mock WAHA payloads

---

## Key Files to Check

When triaging a bug or understanding a feature:

1. **API surface**: `src/app/api/[feature]/` — Route definitions
2. **Business logic**: `src/services/[domain]/` — Core implementation
3. **Validation**: `src/lib/api-schemas.ts` — Input validation
4. **Database**: `src/db/schema.ts` — Data model
5. **UI**: `src/components/[domain]/` — Frontend
6. **Utilities**: `src/lib/` — Helpers & integrations
7. **Migrations**: `drizzle/migrations/` — Schema history

---

## Important Notes

- **Bun only** — No npm/yarn. Use `bunx` for CLI tools.
- **TypeScript strict mode** — All code must pass type checking.
- **Specs drive changes** — See `openspec/AGENTS.md` for proposal workflow.
- **No secrets in code** — All credentials from `.env.local`.
- **Clerk auth required** — Most routes protected by middleware.
- **Tests required** — New features must include Vitest tests.

---

## Git & GitHub Workflow (AI Agents)

Use `gh` CLI for all Git operations instead of legacy `git` commands:

### Creating Pull Requests

```bash
# GOOD - Use gh CLI to create PRs
gh pr create --title "fix: resolve auth issue" \
  --body "Fixes #123. Changes include..." \
  --base main

# Create as draft
gh pr create --draft --title "WIP: feature" --body "Work in progress"

# BAD - Never use git push
git push origin feature-branch  # ❌
```

### Before Any Operation

```bash
git status                      # Review what changed
git diff --cached               # See staged changes
git log --oneline -5            # Check recent commits
```

### Branch Management with gh CLI

```bash
# Create and switch to new branch
gh repo clone                   # Clone repository
gh pr checkout [number]         # Switch to PR branch
gh pr merge [number]            # Merge PR
```

### Issue Management with gh CLI

```bash
# Create and manage issues
gh issue create --title "Bug: Auth fails" --body "Description"
gh issue list
gh issue close [number]
```

### Key Rules for AI Agents

- **Never use `git push`** → Always use `gh pr create`
- **Never use `git pull`** → Use `gh pr checkout` for PRs
- **Always review** → Run `git status` and `git diff` before operations
- **Never use `--force`** → Protect repository history
- **Document changes** → Update `.env.example`, `README.md`, and specs when needed
