# Development Guide

## Prerequisites

| Tool       | Version | Purpose                                   |
| ---------- | ------- | ----------------------------------------- |
| pnpm       | 1.x     | Runtime and package manager               |
| Node.js    | 18+     | Required by Next.js                       |
| PostgreSQL | Latest  | Database                                  |
| Redis      | 7+      | Caching and rate limiting                 |
| MinIO/S3   | Latest  | Object storage (optional, for production) |

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd prima

# Install dependencies (pnpm required)
pnpm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Generate database migrations
pnpm run db:generate

# Push schema to database
pnpm run db:push

# Set up first user
pnpm run setup-first-user

# Start development server
pnpm dev
```

## Development Commands

### Running the Application

```bash
# Development with Turbopack
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start
```

### Database Operations

```bash
# Generate migration from schema changes
pnpm run db:generate

# Push schema changes (development)
pnpm run db:push

# Run migrations (production)
pnpm run db:migrate

# Open Drizzle Studio
pnpm run db:studio

# Nuke and recreate database (local only)
pnpm run nuke-recreate-db

# Set up first user after DB reset
pnpm run setup-first-user

# Start background message worker
pnpm run start-message-worker

# Optimize database indexes
pnpm run db:optimize-indexes

# Monitor index health (monthly maintenance)
pnpm run db:monitor-indexes
```

### Code Quality

```bash
# Run linting
pnpm run lint

# Type check
pnpx tsc --noEmit

# Precommit check (lint + typecheck)
pnpm run precommit
```

### Testing

```bash
# Run unit tests
pnpm test

# Run comprehensive test suite (~8 min)
pnpm run test:comprehensive
```

### Build Analysis

```bash
# Build with bundle analysis
pnpm run build:analyze

# Analyze bundle
pnpm run analyze-bundle
```

## Project Structure

```
prima/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── services/      # Business logic
│   ├── db/            # Database schemas
│   ├── lib/           # Utilities
│   ├── hooks/         # React hooks
│   └── types/         # TypeScript types
├── tests/             # Test files
├── scripts/           # Utility scripts
├── drizzle/           # Drizzle migrations
└── public/            # Static assets
```

## Code Conventions

### TypeScript

- Use strict TypeScript mode
- Prefer `unknown` over `any`
- Use explicit return types for exported functions
- Use Zod for runtime validation at boundaries

### React Components

- Use TypeScript for all components
- Use CVA (class-variance-authority) for variants
- Build on Radix UI primitives for accessibility
- Use Lucide icons consistently

### API Routes

- Keep controllers thin
- Use Zod schemas for validation
- Delegate to service layer for business logic
- Use `createApiHandler()` for consistent error handling

### Services

- Static methods for stateless operations
- Dependency injection patterns
- Use Drizzle for database access
- Throw typed errors

### Database

- Define all indexes in schema files only
- Use composite indexes for common queries
- Follow naming convention: `{table}_{columns}_{type}_idx`
- Add indexes only when profiling shows need

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/prima

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# WhatsApp (GOWA)
GOWA_ENDPOINT=http://localhost:3001
GOWA_BASIC_AUTH_USER=admin
GOWA_BASIC_AUTH_PASSWORD=password
GOWA_WEBHOOK_SECRET=your-webhook-secret

# Allow unsigned webhooks in development
ALLOW_UNSIGNED_WEBHOOKS=true

# AI (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Redis
REDIS_URL=redis://localhost:6379

# Object Storage (MinIO/S3)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PUBLIC_ENDPOINT=http://localhost:9000

# Internal API Key
INTERNAL_API_KEY=your-internal-api-key
```

### Optional Features

```bash
# Enable WhatsApp retry with exponential backoff
FEATURE_FLAG_PERF_WHATSAPP_RETRY=true

# Enable atomic idempotency checking
FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY=true
```

## Git Workflow

### Commit Format

Follow [Conventional Commits](https://wwwconventionalcommits.org/):

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

Example:

```
feat(reminder): add scheduled snooze option
```

### Branch Naming

- `main` - Production branch
- `feat/*` - Feature branches
- `fix/*` - Bug fix branches
- `docs/*` - Documentation updates

## Testing Strategy

### Unit Tests

- Located in `tests/` directory
- Use Vitest framework
- Mock external services (GOWA, Clerk, Anthropic)
- Run with `pnpm test`

### Test Coverage Areas

1. Service layer business logic
2. Utility functions
3. Component rendering
4. API route validation

## Debugging

### API Routes

Check `src/app/api/*` for route handlers.

### Business Logic

Check `src/services/*` for domain logic.

### Database Issues

Check `src/db/*` for schema and queries.

### Webhooks

Check `src/app/api/webhooks/*` for webhook handlers.

## Performance Optimization

### Database Indexes

```bash
# Check for unused indexes (monthly)
pnpm run db:monitor-indexes

# Clean up redundant indexes (quarterly)
pnpm run db:optimize-indexes
```

### Build Analysis

```bash
# Analyze bundle size
pnpm run build:analyze
pnpm run analyze-bundle
```

## Common Tasks

### Adding a New API Route

1. Create route handler in `src/app/api/[domain]/route.ts`
2. Add Zod validation schema in `src/lib/api-schemas.ts`
3. Implement business logic in `src/services/[domain]/`
4. Add route to protected routes in `src/middleware.ts` if auth required

### Modifying Database Schema

1. Edit schema files in `src/db/`
2. Run `pnpx drizzle-kit generate`
3. Review generated SQL in `drizzle/migrations/`
4. Run `pnpx drizzle-kit push` to apply

### Adding a New Component

1. Create component in appropriate directory under `src/components/`
2. Use TypeScript
3. Use CVA for variants
4. Build on Radix primitives for accessibility
5. Export from feature index file

### Adding a New Service

1. Create service file in `src/services/[domain]/`
2. Use static method pattern
3. Implement business logic
4. Use Drizzle for database access
5. Throw typed errors for exceptional cases
