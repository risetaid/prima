# PRIMA Development Guide

Complete guide for setting up, developing, and maintaining the PRIMA healthcare platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Development Workflow](#development-workflow)
- [Common Tasks](#common-tasks)
- [Database Management](#database-management)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Debugging](#debugging)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Prerequisites

### Required Software

| Software       | Version | Purpose                   | Installation           |
| -------------- | ------- | ------------------------- | ---------------------- |
| **Bun**        | Latest  | JavaScript runtime        | https://bun.sh         |
| **Node.js**    | 18+     | Fallback runtime          | https://nodejs.org     |
| **Git**        | Latest  | Version control           | https://git-scm.com    |
| **PostgreSQL** | 14+     | Database (optional local) | https://postgresql.org |
| **Redis**      | 6+      | Caching (optional local)  | https://redis.io       |

### Recommended Tools

- **VS Code** - Code editor
  - Extensions: ESLint, Tailwind CSS IntelliSense, Prettier
- **Postman/Insomnia** - API testing
- **DBeaver/Drizzle Studio** - Database management
- **Redis Commander** - Redis GUI

### Cloud Services Accounts

1. **Clerk** - Authentication (https://clerk.com)
2. **Neon** - PostgreSQL hosting (https://neon.tech)
3. **Upstash** - Redis hosting (https://upstash.com)
4. **GOWA** - WhatsApp API (self-hosted or provider)
5. **Anthropic** - Claude AI (https://anthropic.com)
6. **Vercel** - Deployment (https://vercel.com)
7. **MinIO** - Object storage (self-hosted or provider)

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/prima.git
cd prima
```

### 2. Install Dependencies

**Using Bun (Required):**

```bash
bun install
```

**DO NOT use npm or yarn** - This project requires Bun for optimal performance.

### 3. Create Environment File

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your values
code .env.local
```

### 4. Setup Database

**Option A: Use Hosted Database (Recommended)**

1. Create Neon PostgreSQL database
2. Copy connection string to `.env.local`

```env
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

**Option B: Local PostgreSQL**

```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt install postgresql
sudo systemctl start postgresql

# Create database
createdb prima_dev

# Set connection string
DATABASE_URL=postgresql://localhost/prima_dev
```

### 5. Run Migrations

```bash
# Push schema to database
bunx drizzle-kit push

# Verify with Drizzle Studio (optional)
bunx drizzle-kit studio
# Opens at http://localhost:4983
```

### 6. Seed Initial Data

```bash
# Create first admin user
bun run setup-first-user

# Seed WhatsApp templates
bunx tsx scripts/seed-templates.ts
```

### 7. Start Development Server

```bash
bun dev
```

Visit http://localhost:3000

---

## Environment Configuration

### Required Environment Variables

Create `.env.local` with these required variables:

```env
# ===== DATABASE =====
DATABASE_URL=postgresql://user:password@host/database

# ===== AUTHENTICATION (Clerk) =====
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# ===== WHATSAPP (GOWA) =====
GOWA_API_URL=http://your-gowa-instance:3000
GOWA_API_KEY=your-gowa-api-key
GOWA_SESSION=default

# ===== AI (Anthropic Claude) =====
ANTHROPIC_API_KEY=sk-ant-...

# ===== CACHING (Redis) =====
REDIS_URL=redis://default:password@host:port

# ===== OBJECT STORAGE (MinIO) =====
MINIO_ENDPOINT=minio.yourdomain.com
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=prima-uploads
MINIO_USE_SSL=false

# ===== INTERNAL SECURITY =====
INTERNAL_API_KEY=generate-random-string-32-chars
CRON_SECRET=generate-random-string-32-chars

# ===== NEXT.JS =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Variables

```env
# YouTube API (for video metadata)
YOUTUBE_API_KEY=your-youtube-api-key

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry (Error tracking)
SENTRY_DSN=https://...

# Email (Future)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
```

### Environment Variable Validation

The app validates required variables on startup. Missing variables will cause errors.

**Check validation in:**

- `src/lib/env.ts` - Environment variable schema
- `src/instrumentation.ts` - Startup validation

---

## Development Workflow

### Daily Development

**1. Pull Latest Changes**

```bash
git pull origin main
bun install  # If dependencies changed
```

**2. Start Dev Server**

```bash
bun dev
# Server starts on http://localhost:3000
# Hot reload enabled (Turbopack)
```

**3. Make Changes**

- Edit files in `src/`
- Changes auto-reload in browser
- TypeScript errors show in terminal

**4. Run Tests**

```bash
# Unit tests
bun test

# Pre-commit checks (lint + typecheck)
bun run precommit
```

**5. Commit Changes**

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(patient): add compliance tracking"

# Push to remote
git push origin feature/compliance-tracking
```

**6. Create Pull Request**

```bash
# Using GitHub CLI
gh pr create --title "Add compliance tracking" --body "Description..."

# Or use GitHub web interface
```

---

### Conventional Commits

Follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

**Format:**

```
<type>(<scope>): <short description>

<optional body>

<optional footer>
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code formatting (no logic change)
- `refactor:` - Code restructuring
- `perf:` - Performance improvement
- `test:` - Add/update tests
- `build:` - Build system changes
- `ci:` - CI/CD changes
- `chore:` - Other maintenance
- `revert:` - Revert previous commit

**Examples:**

```bash
feat(reminder): add custom recurrence patterns
fix(whatsapp): prevent duplicate message processing
docs: update API documentation
refactor(patient): extract compliance service
perf(db): optimize reminder query indexes
test(api): add patient endpoint tests
```

---

## Common Tasks

### Create New API Endpoint

**1. Create Route File**

```bash
# Example: GET /api/reports
src/app/api/reports/route.ts
```

**2. Implement Handler**

```typescript
import { createApiHandler } from "@/lib/api-helpers";
import { schemas } from "@/lib/api-schemas";

export const GET = createApiHandler(
  {
    auth: "required",
    query: schemas.list, // Optional query validation
  },
  async (data, { user, query }) => {
    // Your logic here
    return { data: [] };
  },
);
```

**3. Add Validation Schema** (if needed)

```typescript
// src/lib/api-schemas.ts
export const reportQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  type: z.enum(["summary", "detailed"]),
});

// Add to schemas export
export const schemas = {
  // ...
  reportQuery: reportQuerySchema,
};
```

**4. Test Endpoint**

```bash
# Using curl
curl http://localhost:3000/api/reports

# Or Postman/Insomnia
```

---

### Create New Service

**1. Create Service File**

```bash
mkdir src/services/analytics
touch src/services/analytics/analytics.service.ts
touch src/services/analytics/analytics.repository.ts
touch src/services/analytics/analytics.types.ts
```

**2. Define Types**

```typescript
// analytics.types.ts
export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  userId?: string;
}

export interface AnalyticsResult {
  totalReminders: number;
  sentToday: number;
  complianceRate: number;
}
```

**3. Implement Repository**

```typescript
// analytics.repository.ts
import { db, reminders } from "@/db";
import { between, eq } from "drizzle-orm";

export class AnalyticsRepository {
  async getRemindersInRange(startDate: Date, endDate: Date) {
    return await db.query.reminders.findMany({
      where: between(reminders.createdAt, startDate, endDate),
    });
  }
}
```

**4. Implement Service**

```typescript
// analytics.service.ts
import { AnalyticsRepository } from "./analytics.repository";
import type { AnalyticsFilters, AnalyticsResult } from "./analytics.types";

export class AnalyticsService {
  private repository = new AnalyticsRepository();

  async getAnalytics(filters: AnalyticsFilters): Promise<AnalyticsResult> {
    const reminders = await this.repository.getRemindersInRange(
      filters.startDate,
      filters.endDate,
    );

    return {
      totalReminders: reminders.length,
      sentToday: reminders.filter((r) => r.sentAt).length,
      complianceRate: this.calculateCompliance(reminders),
    };
  }

  private calculateCompliance(reminders: any[]) {
    // Calculate compliance logic
    return 85.5;
  }
}
```

---

### Create New Component

**1. Create Component File**

```bash
touch src/components/analytics/analytics-dashboard.tsx
```

**2. Implement Component**

```typescript
'use client'  // If using client-side features

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AnalyticsDashboardProps {
  data: AnalyticsData
  onRefresh: () => void
}

export function AnalyticsDashboard({
  data,
  onRefresh
}: AnalyticsDashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <h3>Total Reminders</h3>
        <p className="text-2xl font-bold">{data.totalReminders}</p>
      </Card>

      <Card>
        <h3>Sent Today</h3>
        <p className="text-2xl font-bold">{data.sentToday}</p>
      </Card>

      <Card>
        <h3>Compliance Rate</h3>
        <p className="text-2xl font-bold">{data.complianceRate}%</p>
      </Card>

      <Button onClick={onRefresh}>Refresh</Button>
    </div>
  )
}
```

**3. Use in Page**

```typescript
// src/app/analytics/page.tsx
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export default async function AnalyticsPage() {
  const data = await fetchAnalytics()

  return (
    <div>
      <h1>Analytics</h1>
      <AnalyticsDashboard data={data} />
    </div>
  )
}
```

---

### Add Database Table

**1. Define Schema**

```typescript
// src/db/new-schema.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
```

**2. Add to Main Schema**

```typescript
// src/db/schema.ts
export * from "./new-schema";

// Add relations if needed
export const reportsRelations = relations(reports, ({ one }) => ({
  // Define relations
}));
```

**3. Generate Migration**

```bash
bunx drizzle-kit generate
```

**4. Review Migration**

```bash
# Check generated SQL
cat drizzle/migrations/0XXX_new_table.sql
```

**5. Apply Migration**

```bash
# Development
bunx drizzle-kit push

# Production (via Vercel or manual)
bunx drizzle-kit migrate
```

---

## Database Management

### Common Operations

**View Current Schema**

```bash
bunx drizzle-kit studio
# Opens web UI at http://localhost:4983
```

**Generate Migration from Schema Changes**

```bash
bunx drizzle-kit generate
```

**Push Schema Directly (Dev Only)**

```bash
bunx drizzle-kit push --force
```

**Run Migrations**

```bash
bunx drizzle-kit migrate
```

**Rollback Migration** (Manual)

```bash
# Find the migration file
ls drizzle/migrations/

# Manually write down SQL
# Connect to DB and run DROP statements
```

---

### Database Seeding

**Seed Initial Admin User**

```bash
bun run setup-first-user
# Follow prompts to create admin user
```

**Seed Templates**

```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/admin/templates/seed \
  -H "X-API-Key: $INTERNAL_API_KEY"
```

**Custom Seed Script**

```typescript
// scripts/seed-custom-data.ts
import { db, patients } from "@/db";

async function seedPatients() {
  await db.insert(patients).values([
    {
      name: "Test Patient 1",
      phoneNumber: "628123456789",
      isActive: true,
    },
  ]);
}

seedPatients();
```

Run:

```bash
bun run scripts/seed-custom-data.ts
```

---

### Database Maintenance

**Monthly Index Health Check**

```bash
bun run db:monitor-indexes
```

**Optimize Indexes (Remove Redundant)**

```bash
bun run db:optimize-indexes
```

**Backup Database** (Production)

```bash
# Neon automatically backs up, but for manual backup:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

**Restore Database**

```bash
psql $DATABASE_URL < backup_20260129.sql
```

---

## Testing

### Unit Tests (Vitest)

**Run All Tests**

```bash
bun test
```

**Run Specific Test File**

```bash
bun test src/lib/phone-utils.test.ts
```

**Run with Coverage**

```bash
bun test --coverage
```

**Watch Mode**

```bash
bun test --watch
```

**Write Unit Test**

```typescript
// src/lib/phone-utils.test.ts
import { describe, it, expect } from "vitest";
import { normalizePhone } from "./phone-utils";

describe("normalizePhone", () => {
  it("converts 0xxx to 62xxx", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("628123456789");
  });

  it("removes non-digit characters", () => {
    expect(normalizePhone("+62 812 3456 7890")).toBe("628123456789");
  });

  it("handles already normalized numbers", () => {
    expect(normalizePhone("628123456789")).toBe("628123456789");
  });
});
```

---

### Integration Tests (Comprehensive Suite)

**Run All Integration Tests**

```bash
bun run test:comprehensive
# Takes ~8 minutes
```

**Run Specific Category**

```bash
bun run test:auth         # Authentication tests
bun run test:reminder     # Reminder system tests
bun run test:whatsapp     # WhatsApp integration tests
bun run test:content      # CMS content tests
bun run test:load         # Load tests (10, 25, 50, 100 users)
```

**View Test Reports**

```bash
# HTML report generated at:
test-results/comprehensive-report.html

# Open in browser
open test-results/comprehensive-report.html
```

**Write Integration Test**

```typescript
// tests/comprehensive-suite/api/patients.test.ts
import { describe, it, expect } from "vitest";
import { createTestClient } from "../utils/test-client";

describe("Patient API", () => {
  const client = createTestClient();

  it("should create patient", async () => {
    const response = await client.post("/api/patients", {
      name: "Test Patient",
      phoneNumber: "0812-3456-7890",
    });

    expect(response.status).toBe(201);
    expect(response.data.patient.phoneNumber).toBe("628123456789");
  });
});
```

---

## Code Quality

### Linting

**Run ESLint**

```bash
bun run lint
```

**Fix Auto-Fixable Issues**

```bash
bun run lint --fix
```

**ESLint Configuration** (`.eslintrc.js`)

```javascript
module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    "no-console": "warn",
    "no-unused-vars": "error",
  },
};
```

---

### Type Checking

**Run TypeScript Compiler**

```bash
bunx tsc --noEmit
```

**Watch Mode**

```bash
bunx tsc --noEmit --watch
```

**Common Type Errors**

**Error: Type 'undefined' is not assignable to type 'X'**

```typescript
// Bad
const patient = await db.query.patients.findFirst(...)
console.log(patient.name)  // Error: patient could be undefined

// Good
const patient = await db.query.patients.findFirst(...)
if (!patient) throw new Error('Patient not found')
console.log(patient.name)  // OK
```

---

### Pre-Commit Checks

**Run Before Committing**

```bash
bun run precommit
```

This runs:

1. ESLint (`bun run lint`)
2. TypeScript check (`bunx tsc --noEmit`)

**Setup Git Hook** (Optional)

```bash
# .husky/pre-commit
#!/bin/sh
bun run precommit
```

---

## Debugging

### Server-Side Debugging

**Console Logging**

```typescript
console.log("Patient data:", patient);
console.error("Error processing:", error);
```

**Structured Logging**

```typescript
import { logger } from "@/lib/logger";

logger.info("Processing reminders", { count: 25 });
logger.error("Failed to send reminder", {
  reminderId,
  error: error.message,
});
```

**Debug API Requests**

```bash
# View request/response in terminal
# API routes log automatically

# Or use debug mode
DEBUG=* bun dev
```

---

### Database Debugging

**Query Logging**

```typescript
import { db } from "@/db";

// Enable query logging
const result = await db.query.patients.findMany();
// Logs SQL to console
```

**Drizzle Studio**

```bash
bunx drizzle-kit studio
# Opens database GUI at http://localhost:4983
```

**Direct SQL Query**

```typescript
import { db } from "@/db";
import { sql } from "drizzle-orm";

const result = await db.execute(sql`
  SELECT * FROM patients WHERE created_at > NOW() - INTERVAL '7 days'
`);
```

---

### Client-Side Debugging

**React DevTools**

- Install React DevTools browser extension
- Inspect component props and state

**Network Tab**

- Open browser DevTools (F12)
- Network tab shows all API requests
- Filter by XHR/Fetch

**Console Logging**

```typescript
"use client";

export function MyComponent() {
  console.log("Component rendered");

  useEffect(() => {
    console.log("Effect ran");
  }, []);
}
```

---

### Debugging WhatsApp Integration

**Test Webhook Locally**

```bash
# Use ngrok or similar to expose localhost
ngrok http 3000

# Configure GOWA to send webhooks to ngrok URL
# https://abc123.ngrok.io/api/webhooks/gowa
```

**View Webhook Logs**

```typescript
// src/app/api/webhooks/gowa/route.ts
console.log("Received webhook:", await request.json());
```

**Test GOWA API**

```bash
# Send test message
curl -X POST http://your-gowa-instance:3000/api/sendText \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $GOWA_API_KEY" \
  -d '{
    "chatId": "628123456789@c.us",
    "text": "Test message"
  }'
```

---

## Deployment

### Vercel Deployment (Recommended)

**1. Connect Repository**

- Go to vercel.com
- Import GitHub repository
- Vercel auto-detects Next.js

**2. Configure Environment Variables**

- Add all variables from `.env.local`
- Use Vercel dashboard: Settings → Environment Variables

**3. Deploy**

```bash
# Automatic deployment on push to main
git push origin main

# Or manual deploy via Vercel CLI
vercel --prod
```

**4. Configure Custom Domain**

- Vercel dashboard: Settings → Domains
- Add custom domain
- Update DNS records

---

### Manual Deployment

**Build for Production**

```bash
bun build
```

**Start Production Server**

```bash
bun start
# Requires PORT environment variable
```

**Using PM2 (Process Manager)**

```bash
# Install PM2
bun add -g pm2

# Start with PM2
pm2 start bun --name prima -- start

# View logs
pm2 logs prima

# Restart
pm2 restart prima
```

---

### Database Migration in Production

**Option A: Automated (Vercel)**

```json
// package.json
{
  "scripts": {
    "postinstall": "bunx drizzle-kit push"
  }
}
```

**Option B: Manual**

```bash
# Generate migration locally
bunx drizzle-kit generate

# Commit migration files
git add drizzle/migrations/*
git commit -m "feat(db): add new table"

# Deploy
git push origin main

# Run migration on production
# (SSH into server or use Vercel CLI)
DATABASE_URL=$PRODUCTION_DB_URL bunx drizzle-kit migrate
```

---

### Cron Jobs Setup

**vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 0,8,12 * * *"
    },
    {
      "path": "/api/cron/cleanup-conversations",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Test Cron Locally**

```bash
curl http://localhost:3000/api/cron \
  -H "X-API-Key: $INTERNAL_API_KEY"
```

---

## Troubleshooting

### Common Issues

**Issue: "Bun command not found"**

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or via npm
npm install -g bun
```

**Issue: "Database connection failed"**

```bash
# Check DATABASE_URL in .env.local
# Verify database is running
# Test connection
psql $DATABASE_URL
```

**Issue: "Clerk webhook signature invalid"**

```bash
# Verify CLERK_WEBHOOK_SECRET matches Clerk dashboard
# Check webhook URL is correct
# Ensure Svix signature verification is working
```

**Issue: "GOWA not receiving messages"**

```bash
# Check GOWA_API_URL is accessible
# Verify GOWA_API_KEY is correct
# Test GOWA API directly
curl http://your-gowa-instance:3000/api/status \
  -H "X-Api-Key: $GOWA_API_KEY"
```

**Issue: "Redis connection timeout"**

```bash
# Check REDIS_URL
# Verify Redis is running
redis-cli ping
# Should return PONG
```

**Issue: "Build fails with TypeScript errors"**

```bash
# Run type check
bunx tsc --noEmit

# Fix errors, then rebuild
bun build
```

---

### Debugging Tips

**Enable Verbose Logging**

```bash
# Set log level in .env.local
LOG_LEVEL=debug

# Or environment variable
LOG_LEVEL=debug bun dev
```

**Clear All Caches**

```bash
# Redis cache
bun run scripts/clear-user-cache.ts

# Next.js cache
rm -rf .next

# Rebuild
bun dev
```

**Reset Database (Local Only)**

```bash
# WARNING: Deletes all data
bun run nuke-recreate-db
bun run setup-first-user
```

---

## Best Practices

### Code Style

**1. TypeScript Strict Mode**

- Always use types, avoid `any`
- Use Zod for runtime validation
- Infer types from Drizzle schema

**2. Component Organization**

```typescript
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// 2. Types/Interfaces
interface Props {
  userId: string
}

// 3. Component
export function MyComponent({ userId }: Props) {
  // 4. Hooks
  const [state, setState] = useState()

  // 5. Event handlers
  const handleClick = () => {}

  // 6. Render
  return <div />
}
```

**3. API Route Pattern**

```typescript
export const GET = createApiHandler(
  { auth: "required", cache: { ttl: 900 } },
  async (data, { user }) => {
    // 1. Validate input
    const filters = validateFilters(data);

    // 2. Check authorization
    if (!canAccess(user, filters)) throw new Error("Forbidden");

    // 3. Call service
    const service = new MyService();
    const result = await service.process(filters);

    // 4. Return data
    return result;
  },
);
```

---

### Security Best Practices

**1. Never Expose Secrets**

```typescript
// Bad
const apiKey = "sk-1234567890";

// Good
const apiKey = process.env.API_KEY;
```

**2. Validate All Input**

```typescript
// Always validate with Zod
const data = schema.parse(input);
```

**3. Sanitize Output**

```typescript
// React auto-escapes, but be careful with dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />
```

**4. Use Prepared Statements**

```typescript
// Drizzle ORM uses prepared statements automatically
// Never concatenate SQL strings
```

---

### Performance Best Practices

**1. Use Server Components When Possible**

```typescript
// Default: Server Component (no 'use client')
export default async function Page() {
  const data = await fetchData()  // Runs on server
  return <Display data={data} />
}
```

**2. Paginate Large Datasets**

```typescript
// Always limit query results
const patients = await db.query.patients.findMany({
  limit: 50,
  offset: (page - 1) * 50,
});
```

**3. Cache Expensive Operations**

```typescript
const cachedData = await getCachedValue(
  "expensive-operation",
  () => expensiveOperation(),
  { ttl: 900 },
);
```

**4. Use Indexes for Frequent Queries**

```sql
-- Add index for common query patterns
CREATE INDEX idx_reminders_patient_active
  ON reminders (patient_id, is_active);
```

---

### Git Workflow

**1. Branch Naming**

```bash
# Feature branches
feature/add-compliance-tracking

# Bug fixes
fix/reminder-duplication

# Hotfixes
hotfix/security-vulnerability
```

**2. Commit Often**

```bash
# Small, focused commits
git commit -m "feat(patient): add phone validation"
git commit -m "test(patient): add validation tests"
git commit -m "docs(patient): update API documentation"
```

**3. Pull Request Process**

1. Create feature branch
2. Make changes with tests
3. Run `bun run precommit`
4. Push and create PR
5. Request review
6. Merge after approval

---

### Documentation

**1. Code Comments**

```typescript
// Use JSDoc for functions
/**
 * Calculate patient compliance rate
 * @param reminders - Array of reminders
 * @returns Compliance rate as percentage (0-100)
 */
export function calculateCompliance(reminders: Reminder[]): number {
  // Implementation
}
```

**2. README Files**

- Add README.md to major directories
- Explain purpose and usage
- Include examples

**3. API Documentation**

- Document in `docs/api-contracts.md`
- Include request/response examples
- Note authentication requirements

---

**Last Updated:** January 29, 2026  
**Version:** 0.1.0  
**Maintainers:** PRIMA Development Team
