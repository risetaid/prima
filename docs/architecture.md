# Architecture

## Executive Summary

PRIMA (Patient Reminder and Information Management Application) is a healthcare platform built with Next.js 15, featuring a layered architecture with clear separation between API routes, business logic services, and data access layers.

## Architecture Pattern

PRIMA follows a **Layered Architecture** pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                    (Next.js App Router / Pages)              │
├─────────────────────────────────────────────────────────────┤
│                     API Layer                                │
│              (Next.js Route Handlers)                        │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│         (Domain Services: ai/, patient/, reminder/)          │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
│            (Drizzle ORM / PostgreSQL)                        │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15 + React 19 | UI rendering, routing |
| **API** | Next.js Route Handlers | REST API endpoints |
| **Services** | TypeScript classes | Business logic |
| **Database** | PostgreSQL + Drizzle ORM | Data persistence |
| **Caching** | Redis (ioredis) | Rate limiting, caching |
| **Auth** | Clerk | Authentication |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   ├── pasien/            # Patient pages
│   ├── pengingat/         # Reminder pages
│   ├── cms/               # Content management
│   └── ...
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── admin/            # Admin components
│   ├── patient/          # Patient components
│   └── ...
├── services/             # Business logic
│   ├── ai/               # AI services
│   ├── patient/          # Patient services
│   ├── reminder/         # Reminder services
│   ├── verification/     # Verification services
│   └── whatsapp/         # WhatsApp services
├── db/                   # Database
│   ├── core-schema.ts    # Users, patients
│   ├── reminder-schema.ts# Reminders, templates
│   ├── content-schema.ts # CMS content
│   └── schema.ts         # Relations
├── lib/                  # Utilities
│   ├── gowa.ts           # WhatsApp client
│   ├── redis.ts          # Redis client
│   ├── rate-limiter.ts   # Rate limiting
│   └── ...
└── types/                # TypeScript types
```

## API Layer

### Route Organization

API routes are organized by domain in `src/app/api/`:

- `admin/` - Administrative functions
- `auth/` - Authentication utilities
- `cms/` - Content management
- `patients/` - Patient CRUD and operations
- `reminders/` - Reminder management
- `templates/` - Template management
- `webhooks/` - External webhooks (Clerk, GOWA)

### Request Handling Pattern

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

### Validation

All inputs validated using Zod schemas from `src/lib/api-schemas.ts`.

## Service Layer

Services are stateless and use dependency injection patterns:

```
src/services/
├── ai/
│   ├── ai-client.ts           # Anthropic client
│   ├── ai-conversation.service.ts
│   ├── ai-general-inquiry.service.ts
│   ├── ai-intent.service.ts
│   └── ai-prompts.ts
├── patient/
│   ├── patient.service.ts
│   ├── patient.repository.ts
│   ├── patient-lookup.service.ts
│   └── compliance.service.ts
├── reminder/
│   ├── reminder.service.ts
│   ├── reminder.repository.ts
│   └── reminder-templates.service.ts
├── verification/
│   └── simple-verification.service.ts
├── whatsapp/
│   └── whatsapp.service.ts
└── conversation-state.service.ts
```

### Service Pattern

```typescript
// src/services/[domain]/[service-name].ts
export class MyService {
  static async doSomething(input: ValidatedInput): Promise<Result> {
    // Business logic here
    // Use Drizzle for DB access
    // Throw errors for exceptional cases
  }
}
```

## Data Layer

### Schema Organization

**Core Schema** (`core-schema.ts`):
- `users` - System users (volunteers, admins)
- `patients` - Patient records
- `medicalRecords` - Patient medical history

**Reminder Schema** (`reminder-schema.ts`):
- `reminders` - Scheduled reminders
- `manualConfirmations` - Volunteer visit confirmations
- `whatsappTemplates` - Message templates
- `conversationStates` - WhatsApp conversation tracking
- `conversationMessages` - Message history
- `volunteerNotifications` - Escalation notifications

**Content Schema** (`content-schema.ts`):
- `cmsArticles` - Educational articles
- `cmsVideos` - Educational videos

### Query Pattern

```typescript
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq } from "drizzle-orm";

const patient = await db.query.patients.findFirst({
  where: eq(patients.id, patientId),
  with: { reminders: true }
});
```

## Authentication

### Clerk Integration

- Routes protected via `src/middleware.ts`
- Webhook handler: `src/app/api/webhooks/clerk/route.ts`
- User sync between Clerk and local DB

### Internal API

Service-to-service calls can use `X-API-Key` header with `INTERNAL_API_KEY`.

## WhatsApp Integration

### Provider: GOWA

- **Incoming messages**: `src/app/api/webhooks/gowa/route.ts`
- **Outgoing messages**: `sendWhatsAppMessage()` from `src/lib/gowa.ts`
- **Typing indicators**: `withTypingIndicator()` wrapper
- **Idempotency**: `isDuplicateEvent()` from `src/lib/idempotency.ts`

### Conversation Flow

1. Message received at webhook
2. Idempotency check (prevents duplicates)
3. Intent detection via AI service
4. Context-aware response generation
5. State tracking in `conversationStates` table

## Key Design Decisions

### Why Drizzle ORM?

- Lightweight with minimal abstraction
- Type-safe SQL queries
- No code generation required
- Native PostgreSQL support

### Why Clerk?

- Managed authentication
- Reduced security burden
- Built-in user management UI

### Why GOWA?

- Self-hosted solution
- Data sovereignty
- Full WhatsApp features

### Why Redis?

- Single solution for caching AND rate limiting
- Atomic operations for idempotency

## Scalability Considerations

1. **Stateless Services**: Horizontal scaling ready
2. **Connection Pooling**: Database connections managed by Drizzle
3. **Rate Limiting**: Redis-based, shared across instances
4. **Caching**: Redis for frequently accessed data
5. **Background Jobs**: Message worker for async processing
