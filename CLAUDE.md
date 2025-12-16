# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRIMA (Patient Reminder and Information Management Application) is a healthcare platform for patient management, reminders, and educational content with WhatsApp integration. Built with Next.js 15 (App Router), Bun runtime, Drizzle ORM, Clerk authentication, and GOWA (go-whatsapp-web-multidevice) for WhatsApp messaging.

## Essential Commands

### Development
```bash
bun install                    # Install dependencies (Bun required, not npm/yarn)
bun dev                        # Start dev server with Turbopack
bun run lint                   # Run ESLint
bunx tsc --noEmit             # Type check without emitting files
bun run precommit             # Run lint + typecheck (use before committing)
```

### Database
```bash
bunx drizzle-kit generate     # Generate migration from schema changes
bunx drizzle-kit push         # Push schema changes to database
bun run db:migrate            # Run migrations
bun run db:studio             # Open Drizzle Studio (DB GUI)
bun run nuke-recreate-db      # Nuke and recreate database (local only)
bun run setup-first-user      # Setup first user after DB reset
```

### Production
```bash
bun build                     # Build for production
bun start                     # Start production server
bun run build:analyze         # Build with bundle analysis
```

### Testing
```bash
bun test                      # Run Vitest unit tests
bun run test:comprehensive    # Run full comprehensive test suite (~8 min)
```

### Background Workers
```bash
bun run start-message-worker  # Start WhatsApp message worker
```

## Architecture Overview

### Layered Architecture

**API Layer** (`src/app/api/*`)
- Thin controllers that validate input and delegate to services
- Use Zod schemas from `src/lib/api-schemas.ts` for validation
- Return responses via `src/lib/error-handler.ts` helpers
- Protected routes defined in `src/middleware.ts` (Clerk auth)

**Service Layer** (`src/services/*`)
- Business logic organized by domain:
  - `ai/` - Anthropic/Claude AI integration
  - `patient/` - Patient management and lookup
  - `reminder/` - Reminder scheduling and sending
  - `verification/` - Patient verification workflows
  - `whatsapp/` - WhatsApp message handling
- Services are stateless and use dependency injection patterns

**Data Layer** (`src/db/*`)
- Drizzle ORM schemas split by domain:
  - `core-schema.ts` - Users, patients, medical records
  - `reminder-schema.ts` - Reminders, confirmations, templates
  - `content-schema.ts` - CMS articles and videos
  - `schema.ts` - Main export with relations
- All database access goes through Drizzle queries (type-safe)

**Utilities** (`src/lib/*`)
- Reusable helpers for validation, error handling, caching, rate limiting
- Key utilities:
  - `api-schemas.ts` - Zod validation schemas
  - `error-handler.ts` - Standardized error responses
  - `gowa.ts` - WhatsApp HTTP API client
  - `idempotency.ts` - Duplicate event prevention (atomic Redis-based)
  - `rate-limiter.ts` - Redis-based rate limiting
  - `logger.ts` - Structured logging
  - `content-formatting.ts` - WhatsApp content formatting utilities
  - `template-utils.ts` - Template variable replacement utilities

### Key Integration Points

**Authentication (Clerk)**
- Routes protected via `src/middleware.ts`
- Webhook handler at `src/app/api/webhooks/clerk/route.ts`
- User sync between Clerk and local DB
- Internal API key bypass: `X-API-Key` header with `INTERNAL_API_KEY`

**WhatsApp (GOWA - go-whatsapp-web-multidevice)**
- Provider: GOWA (go-whatsapp-web-multidevice)
- Webhook receiver: `src/app/api/webhooks/gowa/route.ts`
- Message sender: `src/lib/gowa.ts`
- Features: Text messages, images, files, typing indicators, message acknowledgments
- Idempotency via `src/lib/idempotency.ts` (prevents duplicate processing)
- Conversation state tracking in `conversation_states` table
- Webhook validation: HMAC SHA256 signature verification

**Database (PostgreSQL via Drizzle)**
- Connection: `src/db/index.ts`
- Schema changes: Edit `src/db/*.ts` → `bunx drizzle-kit generate` → review SQL → `bunx drizzle-kit push`
- Migrations stored in `drizzle/migrations/`

**AI (Anthropic Claude)**
- Service layer: `src/services/ai/*`
- Used for intelligent message responses and content generation

**File Storage (MinIO)**
- S3-compatible object storage
- Configuration via `MINIO_*` environment variables

**Caching & Rate Limiting (Redis)**
- Connection: `src/lib/redis.ts`
- Rate limiter: `src/lib/rate-limiter.ts`
- Response cache: `src/lib/response-cache.ts`

## Development Workflow

### Making Changes

1. **Read existing code first** - Never propose changes without reading the file
2. **Validate inputs** - Use Zod schemas from `src/lib/api-schemas.ts`
3. **Keep controllers thin** - Business logic belongs in `src/services/*`
4. **Type safety** - Run `bunx tsc --noEmit` before committing
5. **Test your changes** - Add unit tests in `tests/` if applicable

### Database Schema Changes

1. Edit schema files in `src/db/` (core-schema, reminder-schema, or content-schema)
2. Run `bunx drizzle-kit generate` to create migration SQL
3. Review generated SQL in `drizzle/migrations/`
4. Run `bunx drizzle-kit push` to apply changes
5. Update any affected services/queries

### Adding API Routes

1. Create route handler in `src/app/api/[domain]/route.ts`
2. Add Zod validation schema in `src/lib/api-schemas.ts`
3. Implement business logic in `src/services/[domain]/`
4. Add route to protected routes in `src/middleware.ts` if auth required
5. Use `createApiHandler` from `src/lib/api-helpers.ts` for consistent error handling

### WhatsApp Integration (GOWA)

**Current Implementation (GOWA):**
- Incoming messages: `src/app/api/webhooks/gowa/route.ts`
- Outgoing messages: Use `sendWhatsAppMessage()` from `src/lib/gowa.ts`
- Typing indicators: Use `withTypingIndicator()` wrapper or `sendChatPresence()` from `src/lib/gowa.ts`
- Image/file sending: Use `sendWhatsAppImage()` or `sendWhatsAppFile()` from `src/lib/gowa.ts`
- Phone formatting: Use `formatWhatsAppNumber()` to normalize Indonesian phone numbers
- Markdown formatting: Use `formatForWhatsApp()` to convert Markdown to WhatsApp formatting
- Always check for duplicate events using `isDuplicateEvent()` from `src/lib/idempotency.ts`
- Conversation state managed via `SimpleConfirmationService` and `ConversationStateService`
- Message acknowledgments (delivered/read) handled automatically in webhook


## Important Conventions

### Design Principles

This codebase follows **YAGNI** (You Aren't Gonna Need It), **DRY** (Don't Repeat Yourself), and **KISS** (Keep It Simple, Stupid) principles:

- **YAGNI**: Don't build infrastructure until it's actually needed. Remove unused code aggressively.
- **DRY**: Extract duplicated logic to shared utilities (see `src/lib/content-formatting.ts`, `src/lib/template-utils.ts`)
- **KISS**: Prefer simple solutions over complex ones. Use environment variables instead of feature flag systems.
- **Document complexity**: When complexity is justified (retry logic, idempotency), document decisions in ADRs (see `docs/architecture/adr/`)

### Code Style
- **Bun only** - Never use npm or yarn commands
- **TypeScript strict mode** - All code must type-check
- **Explicit return types** - For exported functions in services
- **Prefer `unknown` over `any`** - Use Zod for runtime validation at boundaries
- **No premature abstraction** - Keep it simple, don't over-engineer
- **Extract duplicated code** - If you see the same logic in multiple places, extract it to a shared utility

### Error Handling
- Services throw typed errors
- API routes catch and format via `src/lib/error-handler.ts`
- Use `createApiHandler()` wrapper for consistent error responses

### Security
- Never commit credentials (use `.env.local`)
- Validate all user inputs with Zod
- Check for SQL injection, XSS, command injection
- Rate limit sensitive endpoints
- Use idempotency for webhooks

### Git Commits
- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Format: `<type>(scope): <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Example: `feat(reminder): add scheduled snooze option`

## Environment Variables

Required variables (see `.env.local`):
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk authentication
- `CLERK_PUBLISHABLE_KEY` - Clerk public key
- `GOWA_ENDPOINT` - GOWA API endpoint URL (current WhatsApp provider)
- `GOWA_BASIC_AUTH_USER` - GOWA basic auth username
- `GOWA_BASIC_AUTH_PASSWORD` - GOWA basic auth password
- `GOWA_WEBHOOK_SECRET` - GOWA webhook HMAC secret for signature verification
- `ALLOW_UNSIGNED_WEBHOOKS` - Allow unsigned webhooks in development (default: true in non-production)
- `ANTHROPIC_API_KEY` - Claude AI API key
- `REDIS_URL` - Redis connection for caching/rate limiting
- `MINIO_*` - MinIO object storage credentials
- `INTERNAL_API_KEY` - Internal API key for service-to-service calls

Optional feature flags (simple env vars):
- `FEATURE_FLAG_PERF_WHATSAPP_RETRY` - Enable WhatsApp retry logic with exponential backoff (default: true)
- `FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY` - Enable atomic idempotency checking (default: true)


## Common Patterns

### API Route Structure
```typescript
// src/app/api/[domain]/route.ts
import { createApiHandler } from "@/lib/api-helpers";
import { mySchema } from "@/lib/api-schemas";
import { MyService } from "@/services/my-service";

export const POST = createApiHandler(async (req) => {
  const body = await req.json();
  const validated = mySchema.parse(body);
  const result = await MyService.doSomething(validated);
  return { success: true, data: result };
});
```

### Service Pattern
```typescript
// src/services/my-domain/my-service.ts
export class MyService {
  static async doSomething(input: ValidatedInput): Promise<Result> {
    // Business logic here
    // Use Drizzle for DB access
    // Throw errors for exceptional cases
  }
}
```

### Database Query Pattern
```typescript
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq } from "drizzle-orm";

const patient = await db.query.patients.findFirst({
  where: eq(patients.id, patientId),
  with: { reminders: true }
});
```

## Debugging Locations

- **API routes**: `src/app/api/*`
- **Business logic**: `src/services/*` (reminder, patient, whatsapp, ai, verification)
- **Database schema**: `src/db/schema.ts` and domain-specific schemas
- **Webhooks**: `src/app/api/webhooks/*` (gowa, clerk)
- **Utilities**: `src/lib/*` (error-handler, rate-limiter, idempotency, logger)
- **Scripts**: `scripts/*` (DB setup, workers, utilities)

## Testing

- Unit tests use Vitest framework
- Test files located in `tests/` directory
- Run tests with `bun test`
- Mock external services (GOWA, Clerk, Anthropic) in tests

## Additional Documentation

- `README.md` - Project setup and quick start
- `.github/copilot-instructions.md` - Detailed AI agent guidance
- `tests/comprehensive-suite/README.md` - Comprehensive testing documentation
- `docs/architecture/adr/` - Architecture Decision Records (ADRs) documenting significant design decisions
  - `001-whatsapp-retry-logic.md` - WhatsApp retry logic with exponential backoff
  - `002-idempotency-strategy.md` - Atomic idempotency for webhook processing
