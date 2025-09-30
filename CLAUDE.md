# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRIMA (Palliative Remote Integrated Monitoring and Assistance) is a production WhatsApp-based patient management system for Indonesian healthcare volunteers. It provides cancer patient care, medication compliance monitoring via Fonnte WhatsApp Business API, and content management.

**Key Architecture:**
- Next.js 15 App Router with React 19
- Bun runtime for fast JavaScript execution
- PostgreSQL with Drizzle ORM (16 tables with soft delete via `deletedAt`)
- Redis caching (ioredis) for performance
- MinIO for S3-compatible file storage
- Clerk authentication with Gmail OAuth
- WIB timezone (UTC+7) for all scheduling

## Common Commands

### Development
```bash
bun run dev              # Start development server with Turbo
bun run build            # Production build
bun run lint             # Run ESLint
bunx tsc --noEmit        # Type checking (no test framework configured)
```

### Database Operations
```bash
bun run db:generate      # Generate Drizzle schema from code
bun run db:migrate       # Run migrations
bun run db:push          # Push schema changes (force)
bun run db:studio        # Open Drizzle Studio GUI
```

### Admin Scripts
```bash
bun run nuke-recreate-db      # Reset database (destructive!)
bun run setup-first-user      # Create initial admin user
bun run start-message-worker  # Start WhatsApp message worker
```

## Architecture & Code Structure

### Service Layer Pattern
Business logic is organized in `src/services/` by domain:
- **`patient/`** - Patient CRUD operations
- **`reminder/`** - Reminder scheduling, follow-ups, compliance tracking
- **`whatsapp/`** - WhatsApp integration via Fonnte API
- **`llm/`** - Conversation state and AI-powered response processing
- **`message-*.service.ts`** - Message queue and worker services
- **`response-processor.service.ts`** - Handles incoming WhatsApp responses

### Database Schema Organization
Schema is modularized in `src/db/`:
- `core-schema.ts` - Users and authentication
- `patient-schema.ts` - Patient records, medical history, health notes
- `reminder-schema.ts` - Reminder schedules, logs, templates, manual confirmations
- `cms-schema.ts` - Articles and videos
- `llm-schema.ts` - Conversation states, messages, volunteer notifications
- `message-queue-schema.ts` - Message queuing system
- `enums.ts` - Shared enums (roles, frequencies, statuses)

All tables use soft delete pattern with `deletedAt` timestamp.

### API Structure (`src/app/api/`)
- **`patients/`** - Patient CRUD and reminder management
- **`reminders/`** - Reminder operations, instant sends
- **`cms/`** - Article and video management
- **`cron/`** - Scheduled tasks (reminders every 30min, follow-ups)
- **`webhooks/`** - Clerk sync, Fonnte incoming messages/status
- **`admin/`** - User approval and management

### Authentication & Authorization
- Use `@/lib/auth-utils.ts` utilities: `getCurrentUser()`, `requireAdmin()`, `requireDeveloper()`
- Never import Clerk directly - use auth utilities
- Role hierarchy: `DEVELOPER > ADMIN > RELAWAN`
- User approval workflow: new users need admin approval before access
- Redis caching: 5min user sessions (`CACHE_TTL.USER_SESSION`)

### Timezone Handling (Critical)
All scheduling uses WIB (UTC+7) via `@/lib/timezone.ts`:
- `getWIBTime()` - Current WIB datetime
- `getWIBDateString()` - YYYY-MM-DD in WIB
- `getWIBTimeString()` - HH:MM in WIB
- `shouldSendReminderNow()` - Checks if reminder should send (exact minute match)
- `createWIBDateTime()` - Convert date/time strings to WIB Date object

Database stores UTC timestamps; always convert for display/scheduling.

### Redis Caching Strategy
Use `@/lib/cache.ts` utilities:
- `getCachedData<T>(key)` - Get cached data with JSON parsing
- `setCachedData(key, data, ttl)` - Set cached data
- `invalidateCache(key)` - Delete cache entry

TTL values in `CACHE_TTL`:
- Patient data: 15min
- Reminder stats: 5min
- User sessions: 5min
- Templates: 10min

Always invalidate cache after mutations.

### WhatsApp Integration
- Service: `src/services/whatsapp/whatsapp.service.ts`
- Incoming webhooks: `/api/webhooks/fonnte/incoming`
- Status webhooks: `/api/webhooks/fonnte/message-status`
- Text-based confirmation system (supports Indonesian response patterns)
- Message templates in `whatsapp_templates` table
- Conversation state tracking via `conversation_states` and `conversation_messages`

### Response Processing Flow
1. Patient sends WhatsApp message → Fonnte webhook
2. `message-processor.service.ts` processes incoming message
3. `response-processor.service.ts` analyzes text response
4. `context-aware-confirmations.service.ts` determines confirmation status
5. Reminder log updated with response
6. Follow-up messages queued if needed (15min delay)

### Message Queue System
- `message-queue.service.ts` - Queue management
- `message-worker.service.ts` - Background worker
- Tables: `message_queue`, `message_queue_failed`
- Retry logic with exponential backoff
- Start worker: `bun run start-message-worker`

## Code Style Requirements

### Imports
- **Always use absolute imports** with `@/` prefix
- **Never use relative imports** (`../` not allowed)
```typescript
// ✓ Correct
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth-utils";

// ✗ Wrong
import { db } from "../../db";
```

### TypeScript
- Strict mode enabled - no `any` types
- Explicit return types required
- Use Drizzle schema types: `User`, `Patient`, `Reminder`, etc.

### Naming Conventions
- camelCase: variables, functions
- PascalCase: components, types, interfaces
- UPPER_SNAKE_CASE: constants

### Error Handling
- Use custom error classes from utilities
- Always use async/await with try/catch
- Never throw raw strings

### Logging
- Use `@/lib/logger` utility, never `console.*`
- Log levels: error, warn, info, debug

### API Responses
- Use `@/lib/api/api-response.ts` wrappers
- Use `@/lib/api/api-utils.ts` for common operations
- Never use raw Next.js Response directly

### UI Components
- Tailwind CSS with `cn()` utility from `@/lib/utils`
- shadcn/ui components in `src/components/ui/`
- Use `class-variance-authority` for component variants

## System-Specific Rules

### Patient Communication
- Address patients by **first name only** (e.g., "David" not "Bapak David")
- Use WhatsApp-compatible formatting: `*bold*` not `**bold**`
- Never give medical advice - direct to professionals
- For emergencies, alert volunteers but PRIMA is not emergency service

### Reminder Messages
- **Do NOT include help/bantuan options** in reminder templates
- PRIMA only tracks compliance, not help requests
- This was intentionally removed for UI simplification

### Patient Variables Feature
- **Removed patient variables override feature** for UI simplification
- Templates now use default patient data only
- Do not re-implement variable overrides unless explicitly requested

### Database Operations
- Always use Drizzle ORM, never raw SQL
- Use proper schema typing from `@/db/schema`
- Implement soft delete: set `deletedAt` instead of actual deletion
- Use transactions for multi-table operations

### Performance
- Cache frequently accessed data (patients, stats, templates)
- Use Redis for session management
- Invalidate cache after mutations
- Use database indexes (defined in schema)

## Quality Checks

After any code changes, always run:
```bash
bunx tsc --noEmit   # Must pass - fix all type errors
bun run lint        # Must pass - fix all lint errors
```

No test framework is configured - rely on type checking and linting.

## Package Manager

**Bun only** - never use npm or yarn. All commands must use `bun` or `bunx`.