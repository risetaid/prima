# PRIMA Source Tree Analysis

Annotated directory structure with purpose and key locations for the PRIMA healthcare platform.

## Table of Contents

- [Root Directory](#root-directory)
- [Source Directory (src/)](#source-directory-src)
- [Application Directory (src/app/)](#application-directory-srcapp)
- [Components Directory (src/components/)](#components-directory-srccomponents)
- [Database Directory (src/db/)](#database-directory-srcdb)
- [Library Directory (src/lib/)](#library-directory-srclib)
- [Services Directory (src/services/)](#services-directory-srcservices)
- [Configuration Files](#configuration-files)
- [Scripts Directory](#scripts-directory)
- [Tests Directory](#tests-directory)
- [Documentation](#documentation)
- [Entry Points](#entry-points)

---

## Root Directory

```
prima/
├── src/                    # Source code (main application)
├── public/                 # Static assets (served at /)
├── docs/                   # Documentation files
├── scripts/                # Database and utility scripts
├── tests/                  # Test suites
├── drizzle/                # Database migrations (generated)
├── migrations/             # Manual SQL migrations
├── node_modules/           # Dependencies (not in git)
├── .next/                  # Next.js build output
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── next.config.ts          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── README.md               # Project overview
├── CLAUDE.md               # AI agent guidance
├── .env.local              # Local environment variables (not in git)
└── .gitignore              # Git ignore rules
```

---

## Source Directory (src/)

**Purpose:** Main application source code

```
src/
├── app/                    # Next.js App Router (pages + API routes)
├── components/             # React components
├── db/                     # Database schema and connection
├── hooks/                  # Custom React hooks
├── lib/                    # Reusable utilities and helpers
├── middleware/             # Request/response middleware
├── services/               # Business logic services
├── types/                  # TypeScript type definitions
├── middleware.ts           # Next.js middleware (auth, routing)
└── instrumentation.ts      # Observability setup
```

### Key Files

**middleware.ts**

- **Purpose:** Route protection and authentication
- **What it does:**
  - Checks Clerk session on every request
  - Redirects unauthenticated users to /sign-in
  - Blocks unapproved users from accessing protected routes
  - Defines public/auth/protected routes

**instrumentation.ts**

- **Purpose:** Application initialization
- **What it does:**
  - Runs once on server startup
  - Initializes logging
  - Connects to external services

---

## Application Directory (src/app/)

**Purpose:** Next.js App Router structure (React Server Components + API routes)

```
src/app/
├── layout.tsx              # Root layout (HTML shell)
├── page.tsx                # Home page (/)
├── global-error.tsx        # Global error boundary
├── not-found.tsx           # 404 page
│
├── (auth)/                 # Auth group (shared layout)
│   ├── sign-in/            # Sign-in page
│   ├── sign-up/            # Sign-up page
│   └── pending-approval/   # Pending approval page
│
├── dashboard/              # Main dashboard
│   ├── page.tsx            # Dashboard home
│   └── loading.tsx         # Loading state
│
├── patients/               # Patient management
│   ├── page.tsx            # Patient list
│   ├── [id]/               # Dynamic patient detail pages
│   │   ├── page.tsx        # Patient profile
│   │   ├── pengingat/      # Patient reminders
│   │   └── history/        # Patient history
│   └── new/                # Create new patient
│
├── admin/                  # Admin panel
│   ├── users/              # User management
│   ├── templates/          # Template management
│   └── analytics/          # Analytics dashboard
│
├── cms/                    # Content management
│   ├── articles/           # Article management
│   └── videos/             # Video management
│
└── api/                    # API routes (HTTP endpoints)
    ├── patients/           # Patient API
    ├── reminders/          # Reminder API
    ├── cms/                # CMS API
    ├── webhooks/           # Webhook receivers
    ├── cron/               # Cron job endpoints
    └── health/             # Health check endpoints
```

### Route Patterns

**Page Routes:**

- `page.tsx` - Route component
- `layout.tsx` - Shared layout
- `loading.tsx` - Loading UI (Suspense)
- `error.tsx` - Error boundary
- `not-found.tsx` - 404 page

**API Routes:**

- `route.ts` - HTTP handlers (GET, POST, PUT, DELETE, PATCH)
- Located at `src/app/api/**/route.ts`
- URL: `/api/[path]`

**Dynamic Routes:**

- `[id]/` - Dynamic parameter (e.g., `/patients/123`)
- `[...slug]/` - Catch-all route

---

## Components Directory (src/components/)

**Purpose:** Reusable React components organized by domain

```
src/components/
├── ui/                     # Base UI components (buttons, inputs, etc.)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── card.tsx
│   └── ... (28 components)
│
├── admin/                  # Admin-specific components
│   ├── user-management.tsx
│   ├── template-management.tsx
│   └── ... (10 components)
│
├── patient/                # Patient management components
│   ├── patient-list.tsx
│   ├── patient-profile-section.tsx
│   └── ... (16 components)
│
├── reminder/               # Reminder components
│   ├── add-reminder-modal.tsx
│   ├── reminder-list-table.tsx
│   └── ... (7 components)
│
├── pengingat/              # Indonesian reminder components
│   ├── patient-reminder-dashboard.tsx
│   └── ... (6 components)
│
├── cms/                    # CMS components
│   ├── article-form-fields.tsx
│   ├── QuillEditor.tsx
│   └── ... (7 components)
│
├── dashboard/              # Dashboard components
│   ├── patient-list-section.tsx
│   └── ... (7 components)
│
├── content/                # Public content display
│   ├── ContentHeader.tsx
│   └── ShareButton.tsx
│
├── auth/                   # Authentication components
│   ├── auth-loading.tsx
│   └── role-guard.tsx
│
├── performance/            # Performance monitoring
│   └── web-vitals.tsx
│
├── providers/              # Context providers
│   └── app-providers.tsx
│
└── volunteer/              # Volunteer-specific components
    └── volunteer-dashboard.tsx
```

### Component Naming Conventions

- **File names:** kebab-case (e.g., `patient-list.tsx`)
- **Component names:** PascalCase (e.g., `PatientList`)
- **UI primitives:** Lowercase (e.g., `button.tsx` → `Button`)

---

## Database Directory (src/db/)

**Purpose:** Drizzle ORM schema definitions and database connection

```
src/db/
├── index.ts                # Database connection and exports
├── schema.ts               # Main schema export + relations
├── core-schema.ts          # Users, Patients, Medical Records
├── reminder-schema.ts      # Reminders, Confirmations, Templates
├── content-schema.ts       # CMS Articles, Videos
├── enums.ts                # PostgreSQL enum types
└── migrations/             # (Empty - migrations in /drizzle/)
```

### Schema Organization

**core-schema.ts** - User and patient management

- `users` - Application users (volunteers, admins)
- `patients` - Cancer patients
- `medicalRecords` - Patient medical history

**reminder-schema.ts** - Reminder system

- `reminders` - Scheduled reminders
- `reminderLogs` - Audit trail
- `manualConfirmations` - Manual follow-ups
- `whatsappTemplates` - Message templates
- `conversationStates` - Multi-turn conversations
- `conversationMessages` - Individual messages
- `volunteerNotifications` - Escalated notifications

**content-schema.ts** - CMS content

- `cmsArticles` - Educational articles
- `cmsVideos` - Educational videos
- `rateLimits` - Rate limiting fallback

**enums.ts** - All PostgreSQL enums

- `userRoleEnum`, `cancerStageEnum`, `verificationStatusEnum`, etc.

### Key Files

**index.ts**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

**schema.ts**

```typescript
// Re-export all tables
export * from './core-schema'
export * from './reminder-schema'
export * from './content-schema'
export * from './enums'

// Define relations for joins
export const usersRelations = relations(...)
export const patientsRelations = relations(...)
```

---

## Library Directory (src/lib/)

**Purpose:** Reusable utilities, helpers, and shared logic

```
src/lib/
├── api-schemas.ts          # Zod validation schemas (API contracts)
├── api-helpers.ts          # API route helpers (createApiHandler)
├── error-handler.ts        # Standardized error responses
├── gowa.ts                 # WhatsApp HTTP API client (GOWA)
├── idempotency.ts          # Duplicate request prevention
├── rate-limiter.ts         # Rate limiting implementation
├── cache.ts                # Redis caching helpers
├── logger.ts               # Structured logging
├── content-formatting.ts   # WhatsApp message formatting
├── template-utils.ts       # Template variable replacement
├── phone-utils.ts          # Phone number normalization
├── date-utils.ts           # Date formatting helpers
└── utils.ts                # General utilities (cn, etc.)
```

### Key Files

**api-schemas.ts**

- **Purpose:** Centralized Zod validation schemas
- **Exports:** `schemas` object with all validation schemas
- **Usage:** Import in API routes for request validation

**api-helpers.ts**

- **Purpose:** Wrapper for API route handlers
- **Key function:** `createApiHandler`
- **Features:**
  - Automatic error handling
  - Authentication checks
  - Caching support
  - Request logging

**gowa.ts**

- **Purpose:** WhatsApp HTTP API client
- **Key functions:**
  - `sendMessage(to, body)` - Send WhatsApp message
  - `sendMessageWithMedia(to, media)` - Send media message
- **Integration:** GOWA (go-whatsapp-web-multidevice)

**idempotency.ts**

- **Purpose:** Prevent duplicate webhook/message processing
- **Key function:** `ensureIdempotent(key, fn, ttl)`
- **Implementation:** Redis-based atomic check

**rate-limiter.ts**

- **Purpose:** Rate limit API requests and webhooks
- **Key function:** `checkRateLimit(identifier, limit, window)`
- **Implementation:** Token bucket with Redis

---

## Services Directory (src/services/)

**Purpose:** Business logic organized by domain

```
src/services/
├── ai/                     # AI/Claude integration
│   ├── ai-client.ts        # Anthropic API client
│   ├── ai-conversation.service.ts
│   ├── ai-intent.service.ts
│   ├── ai-general-inquiry.service.ts
│   └── ai-prompts.ts       # Claude prompt templates
│
├── patient/                # Patient domain
│   ├── patient.service.ts  # Main patient operations
│   ├── patient.repository.ts # Database queries
│   ├── patient.types.ts    # TypeScript types
│   ├── patient-lookup.service.ts
│   ├── compliance.service.ts
│   └── patient-access-control.ts
│
├── reminder/               # Reminder domain
│   ├── reminder.service.ts
│   ├── reminder.repository.ts
│   ├── reminder.types.ts
│   ├── reminder-templates.service.ts
│   └── context-aware-confirmations.service.ts
│
├── verification/           # Patient verification
│   └── simple-verification.service.ts
│
├── whatsapp/               # WhatsApp messaging
│   └── whatsapp.service.ts
│
├── conversation-state.service.ts # Conversation management
├── keyword-matcher.service.ts    # Keyword detection
├── rate-limit.service.ts         # Rate limiting
├── response-handler.ts           # WhatsApp response handling
└── simple-confirmation.service.ts # Reminder confirmations
```

### Service Patterns

**Service Class Structure:**

```typescript
export class PatientService {
  // Dependencies (repository, other services)
  private repository = new PatientRepository();
  private complianceService = new ComplianceService();

  // Public methods (business operations)
  async create(data: CreatePatientInput) {}
  async update(id: string, data: UpdatePatientInput) {}
  async findById(id: string) {}
  async listWithCompliance(filters: PatientFilters) {}

  // Private methods (internal helpers)
  private async validatePhoneNumber(phone: string) {}
}
```

**Repository Pattern:**

```typescript
export class PatientRepository {
  // Database queries only (no business logic)
  async findAll(filters: PatientFilters) {
    return await db.query.patients.findMany(...)
  }

  async findById(id: string) {
    return await db.query.patients.findFirst(...)
  }

  async create(data: NewPatient) {
    return await db.insert(patients).values(data).returning()
  }
}
```

---

## Configuration Files

### package.json

**Purpose:** Project metadata, dependencies, and scripts

**Key Scripts:**

```json
{
  "dev": "next dev --turbo",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "precommit": "bun run lint && bunx tsc --noEmit",
  "db:generate": "bunx drizzle-kit generate",
  "db:push": "bunx drizzle-kit push",
  "db:studio": "bunx drizzle-kit studio",
  "test:comprehensive": "bun run tests/comprehensive-suite/index.ts"
}
```

---

### tsconfig.json

**Purpose:** TypeScript compiler configuration

**Key Settings:**

- `strict: true` - Strict type checking
- `noUncheckedIndexedAccess: true` - Safer array access
- `paths: { "@/*": ["./src/*"] }` - Import aliases

---

### next.config.ts

**Purpose:** Next.js framework configuration

**Key Settings:**

```typescript
export default {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["minio.example.com", "img.youtube.com"],
  },
  experimental: {
    serverActions: true,
  },
};
```

---

### tailwind.config.js

**Purpose:** Tailwind CSS theme and plugin configuration

**Custom Theme:**

- Colors (primary, success, warning, error)
- Fonts (Inter, JetBrains Mono)
- Spacing, breakpoints, animations

---

### drizzle.config.ts

**Purpose:** Drizzle ORM configuration

**Settings:**

```typescript
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
```

---

## Scripts Directory

**Purpose:** Database management and utility scripts

```
scripts/
├── nuke-recreate-database.ts      # Reset database (local only)
├── setup-first-user.ts            # Create initial admin user
├── apply-migration.ts             # Apply SQL migrations
├── optimize-database-indexes.ts   # Clean up redundant indexes
├── monitor-index-health.ts        # Monthly index health check
├── normalize-phone-numbers.ts     # Normalize existing phone data
├── dump-cms-content.ts            # Export CMS content
├── clear-user-cache.ts            # Clear Redis cache
├── start-message-worker.ts        # Start background worker
└── validate-phase8-db.ts          # Validate schema integrity
```

### Common Scripts

**Reset Database (Local Development):**

```bash
bun run nuke-recreate-db
bun run setup-first-user
```

**Database Maintenance:**

```bash
# Check index health (monthly)
bun run db:monitor-indexes

# Optimize indexes (as needed)
bun run db:optimize-indexes
```

**Cache Management:**

```bash
# Clear all caches
bun run scripts/clear-user-cache.ts
```

---

## Tests Directory

**Purpose:** Automated test suites

```
tests/
├── comprehensive-suite/    # Integration tests
│   ├── index.ts            # Test runner
│   ├── QUICKSTART.md       # Test documentation
│   ├── auth/               # Authentication tests
│   ├── reminder/           # Reminder system tests
│   ├── whatsapp/           # WhatsApp integration tests
│   ├── content/            # CMS tests
│   └── load/               # Load testing
│
├── app/                    # Application tests
│   └── api/                # API route tests
│
├── db/                     # Database tests
│   └── schema.test.ts
│
├── lib/                    # Utility tests
│   └── phone-utils.test.ts
│
└── middleware.test.ts      # Middleware tests
```

### Running Tests

**Unit Tests (Vitest):**

```bash
bun test
```

**Comprehensive Suite:**

```bash
# All tests (~8 minutes)
bun run test:comprehensive

# Specific categories
bun run test:auth
bun run test:reminder
bun run test:whatsapp
bun run test:content
bun run test:load
```

---

## Documentation

**Purpose:** Project documentation

```
docs/
├── README.md                   # (This file will be generated)
├── api-contracts.md            # API endpoint documentation
├── data-models.md              # Database schema documentation
├── component-inventory.md      # Component catalog
├── architecture.md             # Architecture overview
├── source-tree-analysis.md     # Directory structure guide
├── development-guide.md        # Development workflows
├── PANDUAN_PENGUJIAN.md        # Testing guide (Indonesian)
│
├── architecture/               # Architecture decision records
│   └── adr/
│
└── plans/                      # Implementation plans
    └── 2025-12-15-cleanup-deprecated-code.md
```

---

## Entry Points

### Application Entry Points

**1. Client Entry Point**

```
Browser → http://app.example.com
    ↓
src/app/layout.tsx (Root layout)
    ↓
src/app/page.tsx (Home page)
```

**2. API Entry Point**

```
HTTP Request → http://app.example.com/api/patients
    ↓
src/middleware.ts (Auth check)
    ↓
src/app/api/patients/route.ts (Handler)
    ↓
src/services/patient/patient.service.ts
    ↓
src/db/ (Database)
```

**3. Webhook Entry Point**

```
GOWA Webhook → POST /api/webhooks/gowa
    ↓
src/app/api/webhooks/gowa/route.ts
    ↓
Idempotency check (Redis)
    ↓
Rate limit check
    ↓
AI intent detection
    ↓
Response handler
```

**4. Cron Entry Point**

```
Vercel Cron → GET /api/cron
    ↓
src/app/api/cron/route.ts
    ↓
src/services/reminder/reminder.service.ts
    ↓
Process scheduled reminders
```

---

### Development Workflow Entry Points

**Start Development Server:**

```bash
bun dev
# → Starts Next.js dev server on localhost:3000
# → Entry: src/app/layout.tsx
```

**Build for Production:**

```bash
bun build
# → Compiles Next.js app to .next/
# → Optimizes assets
# → Generates static pages
```

**Database Schema Changes:**

```bash
# 1. Edit schema in src/db/
# 2. Generate migration
bunx drizzle-kit generate
# 3. Review SQL in drizzle/migrations/
# 4. Apply to database
bunx drizzle-kit push
```

---

## File Naming Conventions

### Pages and Routes

- `page.tsx` - Page component
- `layout.tsx` - Layout component
- `route.ts` - API route handler
- `loading.tsx` - Loading UI
- `error.tsx` - Error UI
- `not-found.tsx` - 404 UI

### Components

- `component-name.tsx` - Regular component
- `ComponentName.tsx` - Exported as default (PascalCase preferred)
- UI primitives: lowercase (e.g., `button.tsx`)

### Services

- `service-name.service.ts` - Service class
- `service-name.repository.ts` - Repository class
- `service-name.types.ts` - Type definitions

### Utilities

- `kebab-case.ts` - Utility files
- `camelCase` - Function names
- `PascalCase` - Class names
- `UPPER_SNAKE_CASE` - Constants

---

## Import Paths

### Path Aliases (tsconfig.json)

```typescript
// Absolute imports from src/
import { PatientService } from "@/services/patient/patient.service";
import { Button } from "@/components/ui/button";
import { db } from "@/db";

// Instead of relative imports
import { PatientService } from "../../../services/patient/patient.service";
```

### Import Order Convention

```typescript
// 1. External dependencies
import { useState } from "react";
import { z } from "zod";

// 2. Internal dependencies (absolute)
import { PatientService } from "@/services/patient/patient.service";
import { Button } from "@/components/ui/button";

// 3. Types
import type { Patient } from "@/db/schema";

// 4. Relative imports (if needed)
import { helper } from "./helpers";
```

---

**Directory Count:** ~50 directories  
**File Count:** ~300+ files  
**Lines of Code:** ~25,000 lines (TypeScript/TSX)  
**Last Updated:** January 29, 2026
