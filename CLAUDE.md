# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRIMA (Palliative Remote Integrated Monitoring and Assistance) is a production-ready WhatsApp-based patient management system for Indonesian healthcare volunteers. It provides comprehensive cancer patient care, medication compliance monitoring, and content management capabilities.

## Development Commands

### Core Development

- `bun run dev` - Start Next.js development server with Turbo
- `bun run build` - Production build with type checking
- `bun run build:analyze` - Production build with bundle analysis
- `bun run start` - Start production server
- `bun run lint` - Run ESLint with Next.js core-web-vitals rules
- `bunx tsc --noEmit` - Run TypeScript type checking
- `bun run analyze-bundle` - Analyze bundle size after build

### Database Management (Drizzle ORM)

- `bun run db:generate` - Generate Drizzle schema from schema.ts
- `bun run db:migrate` - Run database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio GUI for database inspection

### Administrative Scripts

- `bun run nuke-recreate-db` - Nuclear option to recreate database (use with caution)
- `bun run setup-first-user` - Set up initial admin user
- `bun run start-message-worker` - Start background message processing worker (located in scripts/)

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 + React 19 + TypeScript 5
- **Authentication**: Clerk with Gmail OAuth and role-based access control
- **Database**: PostgreSQL with Drizzle ORM and comprehensive soft delete patterns
- **Caching**: Redis with ioredis client (3min sessions, 15min patient data)
- **UI**: Tailwind CSS 4 + shadcn/ui components + Lucide React icons
- **WhatsApp**: Fonnte WhatsApp Business API for messaging
- **File Storage**: Cloud storage for patient photos and content
- **Rich Text**: QuillJS with image upload support

### Key Service Layer Architecture

The application follows a clean architecture with domain-driven service layers:

- **Domain Services**: Located in `src/services/` with comprehensive business domain modules:

  - `patient/` - Patient management, access control, compliance tracking, health notes, variables
  - `reminder/` - Smart reminders, follow-up logic, confirmations, scheduling, linked confirmations
  - `whatsapp/` - WhatsApp Business API integration with conversation state management
  - `llm/` - OpenAI and Anthropic integration with prompt management, safety filtering, and response templates
  - `analytics/` - Compliance tracking and reporting with performance monitoring
  - `education/` - Health education and knowledge base services
  - `notification/` - Escalation and volunteer notification services
  - `security/` - Data access validation and security utilities
  - `response-handlers/` - Specialized handlers for different WhatsApp response types

- **Repository Pattern**: Each service has corresponding repository files for data access with transaction safety and optimized query building

- **Message Processing**: Separate message worker service with queue processing and retry logic

- **Response Processing**: Sophisticated response processor with context-aware handlers for verification, follow-up, knowledge, and general inquiries

- **Data Layer**:

  - Modular schema files in `src/db/` (core-schema.ts, patient-schema.ts, cms-schema.ts, reminder-schema.ts, llm-schema.ts, message-queue-schema.ts)
  - All tables use soft deletes via `deletedAt` timestamp
  - 16 optimized tables with comprehensive foreign key relationships across core, patient, CMS, reminder, LLM, and message queue domains
  - Strategic indexing for common query patterns and performance optimization
  - Comprehensive enum definitions for type safety

- **Authentication**:
  - Multi-layer security with Clerk OAuth and database sync
  - Role-based access control (DEVELOPER/ADMIN/RELAWAN)
  - Request deduplication to prevent race conditions
  - Patient access control with permission checking

### Critical Timezone Handling

The system operates in WIB (UTC+7) timezone for Indonesian healthcare workers:

- All reminder scheduling uses `src/lib/timezone.ts` utilities
- Cron jobs at `src/app/api/cron/route.ts` handle automated reminders
- Store timestamps in UTC, convert via timezone utilities using `src/lib/timezone.ts`

### WhatsApp Integration

- Central WhatsApp service at `src/services/whatsapp/whatsapp.service.ts`
- **Text-based confirmation system**: Simple text message interactions for patient responses (no polls/buttons)
- **Response-driven workflows**: 15-minute follow-up messages based on patient text responses
- **No timer-based auto-confirmation**: Always waits for explicit patient response
- Automated medication reminders with content attachments
- Patient verification workflows with retry logic
- Template-based message management
- Fonnte WhatsApp Business API for reliable message delivery
- Conversation state management for context-aware interactions

### LLM Integration

- Multi-provider support (OpenAI and Anthropic) with comprehensive type definitions
- A/B testing framework for prompt optimization with template management
- Safety filtering for medical advice with content validation
- Template-based prompt management system with response templates
- Knowledge base integration for enhanced responses
- Response processor with specialized handlers for different inquiry types

### Performance & Caching Strategy

- **Redis Caching**: Smart TTLs (30s for patients, 5m for sessions, 3m for user data) with automatic compression for datasets >1KB
- **Automatic Compression**: Large datasets (>1KB) compressed automatically for efficient storage
- **Stale-While-Revalidate**: Background refresh for better performance and user experience
- **Event-Driven Invalidation**: Automatic cache clearing after data modifications
- **Performance Monitoring**: Comprehensive cache analytics and metrics via performance monitoring service
- **Bundle Analysis**: Built-in webpack bundle analyzer for optimization
- **Connection Pooling**: Separate DATABASE_URL (pooled) and DIRECT_URL (direct) for optimal performance

## File Structure Conventions

### Directory Organization

```
src/
├── app/                        # Next.js app router
│   ├── api/                   # API endpoints
│   │   ├── admin/             # Admin management APIs
│   │   ├── patients/          # Patient CRUD and operations
│   │   ├── cms/               # Content management
│   │   ├── cron/              # Automated reminder system
│   │   └── webhooks/          # Clerk user synchronization
│   ├── dashboard/             # Protected dashboard pages
│   │   ├── admin/             # Admin panel and user management
│   │   ├── pasien/            # Patient management interface
│   │   ├── pengingat/         # Reminder scheduling system
│   │   └── cms/               # Content management interface
│   └── content/               # Public content pages (ISR enabled)
├── components/
│   ├── admin/                 # Admin-specific components
│   ├── patient/               # Patient management components
│   ├── reminder/              # Reminder scheduling components
│   └── ui/                    # Reusable shadcn/ui components
├── services/                  # Business logic layer
├── lib/                       # Utilities and helpers
└── db/                        # Database schema and connection
```

### Naming Conventions

- Files: kebab-case (e.g., `patient-list.tsx`)
- React components: PascalCase in `.tsx` files
- Variables/functions: camelCase
- Database columns: snake_case, mapped to TypeScript camelCase
- API routes follow REST conventions with proper HTTP methods

## Code Quality Standards

### TypeScript Configuration

- Strict TypeScript with comprehensive type checking
- All inputs validated with Zod schemas in `src/lib/validations.ts`
- 2-space indentation enforced by ESLint

### Database Patterns

- All tables implement soft delete via `deletedAt` timestamp
- Foreign key relationships properly defined in schema
- Use repository pattern for complex queries
- Cache frequently accessed data with appropriate TTL

### Security Best Practices

- Role-based access control enforced on all protected routes
- Environment variables for secrets (never commit to repo)
- Input validation with Zod on all API endpoints
- Audit trails for sensitive operations

## Development Workflow

### Pre-commit Checklist

1. Run type checking: `bunx tsc --noEmit`
2. Run linting: `bun run lint --quiet`
3. Address all errors before committing

### Commit Standards

- Use conventional commit format: `feat(scope): description`
- Include scope when relevant (e.g., `feat(reminders): add retry logic`)
- Present tense, imperative mood

### Environment Setup

Essential environment variables (never commit actual values):

- `DATABASE_URL` - PostgreSQL connection (pooled for app operations)
- `DIRECT_URL` - PostgreSQL direct connection (for migrations)
- `REDIS_URL` - Redis cache connection
- `CLERK_SECRET_KEY` - Clerk authentication
- `FONNTE_TOKEN` - WhatsApp Business API
- `BLOB_READ_WRITE_TOKEN` - Cloud storage
- `TINYMCE_API_KEY` - Rich text editor
- `CRON_SECRET` - Automated reminder system security

## Important Architecture Patterns

### Error Handling Patterns

- **Custom Error Types**: ValidationError, NotFoundError, ReminderError per service
- **Exponential Backoff**: WhatsApp API retry logic
- **Circuit Breakers**: Redis fallback patterns
- **Graceful Degradation**: System continues with degraded capabilities
- **Transaction Safety**: Critical operations wrapped in database transactions

### Database Optimization

- Comprehensive indexing on frequently queried columns
- Soft delete patterns maintain data integrity
- Drizzle ORM with prepared statements for performance
- Connection pooling (separate URLs for app vs. migrations)

### WhatsApp Rate Limiting

- Built-in retry logic for failed message delivery
- Idempotency checks to prevent duplicate sends
- Batch processing for bulk operations

## Important Notes

- Always use timezone utilities from `src/lib/timezone.ts` for date operations
- Respect role-based access control in all API endpoints
- Test WhatsApp integrations thoroughly in development environment
- Cache invalidation is critical when updating user or patient data
- Follow existing patterns for new feature development
- Medication reminders are scheduled via cron jobs - test timing carefully

## Text-Based Interaction System

### Implementation Patterns

- **Text response verification**: Simple text message patterns for patient verification
- **Medication confirmation**: Text-based responses for medication compliance tracking
- **Response-driven workflow**: Auto-confirmation based on patient text responses, not timers
- **Follow-up system**: Send "Halo {nama}, apakah sudah diminum obatnya?" 15 minutes after initial reminder
- **Status flow**: TERJADWAL → PERLU_DIPERBARUI → SELESAI based on patient responses

### Technical Requirements

- Text responses processed via webhook at `/api/webhooks/fonnte/incoming/route.ts`
- Database schema includes response tracking in `reminderLogs` and conversation tables
- Implement robust text pattern matching for Indonesian language responses
- Maintain flexibility for various text response patterns
- Implement proper error handling and fallback mechanisms

### API Integration Rules

- Always reference official Fonnte documentation at https://docs.fonnte.com/
- Use simple text message format for reliable delivery across all WhatsApp clients
- Never implement timer-based auto-confirmation - always response-driven
- Preserve manual confirmation options for relawan when needed
- Follow Indonesian language patterns and WIB timezone for healthcare context
