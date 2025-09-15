# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRIMA (Palliative Remote Integrated Monitoring and Assistance) is a production-ready WhatsApp-based patient management system for Indonesian healthcare volunteers. It provides comprehensive cancer patient care, medication compliance monitoring, and content management capabilities.

## Development Commands

### Core Development
- `bun run dev` - Start Next.js development server with Turbo
- `bun run build` - Production build with type checking
- `bun run start` - Start production server
- `bun run lint` - Run ESLint with Next.js core-web-vitals rules

### Database Management (Drizzle ORM)
- `bun run db:generate` - Generate Drizzle schema from schema.ts
- `bun run db:migrate` - Run database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio GUI for database inspection

### Testing
- `bunx jest` - Run all tests
- `bunx jest --watch` - Run tests in watch mode
- `bunx jest src/__tests__/[specific-file].test.ts` - Run specific test file

### Administrative Scripts
- `bun run nuke-recreate-db` - Nuclear option to recreate database (use with caution)
- `bun run setup-first-user` - Set up initial admin user

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 + React 19 + TypeScript 5
- **Authentication**: Clerk with Gmail OAuth and role-based access control
- **Database**: PostgreSQL with Drizzle ORM and comprehensive soft delete patterns
- **Caching**: Redis with ioredis client (3min sessions, 15min patient data)
- **UI**: Tailwind CSS 4 + shadcn/ui components + Lucide React icons
- **WhatsApp**: Fonnte WhatsApp Business API for messaging
- **File Storage**: Cloud storage for patient photos and content
- **Rich Text**: TinyMCE with image upload support

### Key Service Layer Architecture

The application follows a clean architecture with service layers:

- **Services**: Located in `src/services/` with domain-specific modules:
  - `patient/` - Patient management, compliance tracking, health notes
  - `reminder/` - Smart reminders, confirmations, scheduling
  - `whatsapp/` - WhatsApp Business API integration
  - `verification/` - Patient verification workflows

- **Data Layer**: 
  - `src/db/schema.ts` - Drizzle schema with comprehensive foreign key relationships
  - All tables use soft deletes via `deletedAt` timestamp
  - 15 optimized tables with proper indexing

- **Authentication**: 
  - `src/lib/auth-utils.ts` - Central auth utilities with Redis caching
  - Role-based access control (SUPERADMIN/ADMIN/MEMBER)
  - Request deduplication to prevent race conditions

### Critical Timezone Handling

The system operates in WIB (UTC+7) timezone for Indonesian healthcare workers:
- All reminder scheduling uses `src/lib/timezone.ts` utilities
- Cron jobs at `src/app/api/cron/route.ts` handle automated reminders
- Store timestamps in UTC, convert via timezone utilities

### WhatsApp Integration

- Central WhatsApp service at `src/services/whatsapp/whatsapp.service.ts`
- **Poll-based interactions**: Ya/Tidak verification polls, Sudah/Belum/Butuh Bantuan medication polls
- **Response-driven confirmation system**: 15-minute follow-up messages based on patient responses
- Automated medication reminders with content attachments
- Patient verification workflows with retry logic
- Template-based message management
- Fonnte WhatsApp Business API with poll functionality (choices, select, pollname parameters)

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

### Testing Requirements
- Tests in `src/__tests__/` as `*.test.ts`/`*.test.tsx`
- Focus on services and API routes
- Mock external dependencies (Redis, database, WhatsApp API)
- Include timezone edge cases for WIB operations
- Run tests before commits: `bunx jest`

## Development Workflow

### Pre-commit Checklist
1. Run type checking: `bunx tsc --noEmit`
2. Run linting: `bun run lint --quiet`
3. Run tests: `bunx jest`
4. Address all errors before committing

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

## Performance Considerations

### Caching Strategy
- Redis caching with specific TTL:
  - User sessions: 3 minutes
  - Patient data: 15 minutes
- ISR for public content with 1-hour revalidation
- Connection pooling for database operations

### Database Optimization
- Comprehensive indexing on frequently queried columns
- Soft delete patterns maintain data integrity
- Drizzle ORM with prepared statements for performance

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

## Poll-Based Interaction System

### Implementation Patterns
- **Verification polls**: Use Ya/Tidak options for patient verification instead of text-based responses
- **Medication confirmation polls**: Use Sudah/Belum/Butuh Bantuan options for medication reminders
- **Response-driven workflow**: Auto-confirmation based on patient poll responses, not timers
- **Follow-up system**: Send "Halo {nama}, apakah sudah diminum obatnya?" 15 minutes after initial reminder
- **Status flow**: TERJADWAL → PERLU_DIPERBARUI → SELESAI based on patient responses

### Technical Requirements
- Poll responses processed via webhook at `/api/webhooks/fonnte/incoming/route.ts`
- Database schema includes poll tracking fields in `reminderLogs` and `pollResponses` tables
- Use official Fonnte documentation patterns for poll implementation
- Maintain backward compatibility with existing text-based responses
- Implement proper error handling and fallback mechanisms

### API Integration Rules
- Always reference official Fonnte documentation at https://docs.fonnte.com/
- Use poll parameters: `choices` (comma-separated), `select` (single/multiple), `pollname` (title)
- Never implement timer-based auto-confirmation - always response-driven
- Preserve manual confirmation options for relawan when needed
- Follow Indonesian language patterns and WIB timezone for healthcare context