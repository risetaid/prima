# Source Tree Analysis

## Project Root

```
C:\BACKUP\Portfolio\Web\prima\
├── .claude/                 # Claude Code configuration
├── .github/                 # GitHub configuration
│   └── copilot-instructions.md
├── .next/                   # Next.js build output (generated)
├── .vscode/                 # VS Code settings
├── _bmad/                   # BMAD workflow tooling
├── _bmad-output/            # BMAD output files
├── docs/                    # Documentation (generated)
├── drizzle/                 # Drizzle ORM migrations
├── migrations/              # Additional migrations
├── public/                  # Static assets
├── scripts/                 # Utility scripts
├── src/                     # Source code
├── test-results/            # Test output
├── tests/                   # Test files
├── drizzle.config.ts        # Drizzle configuration
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
└── vitest.config.ts         # Vitest configuration
```

## Source Directory Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── admin/          # Admin endpoints
│   │   ├── auth/           # Auth utilities
│   │   ├── cms/            # Content management
│   │   ├── cron/           # Cron jobs
│   │   ├── dashboard/      # Dashboard data
│   │   ├── debug/          # Debug endpoints
│   │   ├── health/         # Health checks
│   │   ├── patients/       # Patient CRUD
│   │   ├── reminders/      # Reminder management
│   │   ├── templates/      # Template management
│   │   ├── upload/         # File uploads
│   │   ├── user/           # User profile
│   │   ├── webhooks/       # External webhooks
│   │   └── youtube/        # YouTube integration
│   ├── admin/              # Admin pages
│   ├── pasien/             # Patient pages
│   ├── pengingat/          # Reminder pages
│   ├── cms/                # Content management pages
│   ├── video-edukasi/      # Video education pages
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── admin/              # Admin feature components
│   ├── auth/               # Auth components
│   ├── cms/                # CMS components
│   ├── content/            # Content display
│   ├── dashboard/          # Dashboard components
│   ├── patient/            # Patient components
│   ├── pengingat/          # Reminder components
│   ├── performance/        # Performance monitoring
│   ├── providers/          # Context providers
│   ├── reminder/           # Reminder form components
│   ├── ui/                 # Base UI components
│   └── volunteer/          # Volunteer components
├── db/                     # Database layer
│   ├── core-schema.ts      # Users, patients, medical records
│   ├── reminder-schema.ts  # Reminders, templates, conversations
│   ├── content-schema.ts   # CMS content
│   ├── enums.ts            # Database enums
│   ├── index.ts            # DB connection
│   └── schema.ts           # Main export with relations
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
│   ├── gowa.ts             # WhatsApp client
│   ├── redis.ts            # Redis client
│   ├── rate-limiter.ts     # Rate limiting
│   ├── idempotency.ts      # Duplicate prevention
│   ├── error-handler.ts    # Error handling
│   ├── api-schemas.ts      # Zod validation schemas
│   ├── api-helpers.ts      # API helpers
│   ├── logger.ts           # Structured logging
│   ├── template-utils.ts   # Template variable replacement
│   ├── content-formatting.ts # WhatsApp formatting
│   └── ...
├── middleware.ts           # Auth middleware
├── services/               # Business logic
│   ├── ai/                 # AI services (Claude)
│   │   ├── ai-client.ts
│   │   ├── ai-conversation.service.ts
│   │   ├── ai-general-inquiry.service.ts
│   │   ├── ai-intent.service.ts
│   │   └── ai-prompts.ts
│   ├── patient/            # Patient services
│   │   ├── patient.service.ts
│   │   ├── patient.repository.ts
│   │   ├── patient-lookup.service.ts
│   │   └── compliance.service.ts
│   ├── reminder/           # Reminder services
│   │   ├── reminder.service.ts
│   │   ├── reminder.repository.ts
│   │   └── reminder-templates.service.ts
│   ├── verification/       # Verification services
│   ├── whatsapp/           # WhatsApp services
│   ├── conversation-state.service.ts
│   ├── keyword-matcher.service.ts
│   ├── response-handler.ts
│   └── simple-confirmation.service.ts
└── types/                  # TypeScript types
```

## Critical Directories

### API Routes (`src/app/api/`)

**Entry Points**: All route files ending in `route.ts`

| Domain | Purpose |
|--------|---------|
| admin/ | User/template management |
| patients/ | Patient CRUD operations |
| reminders/ | Reminder scheduling |
| webhooks/ | External integrations |
| cms/ | Content management |

### Services Layer (`src/services/`)

**Entry Points**: Static export methods

| Service | Purpose |
|---------|---------|
| ai/ | Claude AI integration |
| patient/ | Patient business logic |
| reminder/ | Reminder management |
| verification/ | Patient verification |
| whatsapp/ | WhatsApp messaging |

### Database (`src/db/`)

**Entry Points**: `schema.ts` exports

| File | Contents |
|------|----------|
| core-schema.ts | Users, Patients, Medical Records |
| reminder-schema.ts | Reminders, Templates, Conversations |
| content-schema.ts | Articles, Videos |
| enums.ts | Database enums |

### Components (`src/components/`)

**Entry Points**: Feature index files or individual components

| Directory | Contents |
|-----------|----------|
| ui/ | Base UI components (button, card, dialog, etc.) |
| admin/ | Admin template/user management |
| patient/ | Patient profile, verification |
| reminder/ | Reminder forms, lists |

## Key Files

### Configuration

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `tsconfig.json` | TypeScript configuration |
| `vitest.config.ts` | Test configuration |

### Entry Points

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout provider |
| `src/middleware.ts` | Authentication middleware |
| `src/lib/redis.ts` | Redis connection |
| `src/lib/gowa.ts` | WhatsApp client |

### API Helpers

| File | Purpose |
|------|---------|
| `src/lib/api-helpers.ts` | API handler utilities |
| `src/lib/api-schemas.ts` | Zod validation schemas |
| `src/lib/error-handler.ts` | Error response formatting |

## File Organization Patterns

### By Feature

Components and services are organized by feature domain:
- `components/admin/` - Admin features
- `components/patient/` - Patient features
- `services/patient/` - Patient business logic

### By Layer

Code follows clean architecture layers:
- **API Layer**: `src/app/api/*/route.ts`
- **Service Layer**: `src/services/*/`
- **Data Layer**: `src/db/*`
- **UI Layer**: `src/components/*`

### Utilities

Shared utilities in `src/lib/`:
- `gowa.ts` - WhatsApp integration
- `redis.ts` - Caching
- `rate-limiter.ts` - Rate limiting
- `idempotency.ts` - Duplicate prevention

## Excluded from Source Analysis

```
├── node_modules/           # Dependencies
├── .next/                  # Build output
├── build/                  # Production build
├── coverage/               # Test coverage
└── dist/                   # Distribution files
```

## Component Hierarchy

```
Root Layout (layout.tsx)
├── Auth Providers (app-providers.tsx)
├── Navigation (ui/navigation.tsx)
├── Page Content (page.tsx)
│   ├── Dashboard (dashboard/*)
│   ├── Patient Management (pasien/*)
│   ├── Reminders (pengingat/*)
│   └── CMS (cms/*)
```

## Dependency Flow

1. **API Request** → Route Handler (`route.ts`)
2. **Validation** → Zod Schema (`api-schemas.ts`)
3. **Business Logic** → Service (`services/*/`)
4. **Data Access** → Drizzle (`db/*`)
5. **Response** → API Helper (`api-helpers.ts`)
