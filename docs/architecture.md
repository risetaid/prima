# PRIMA Architecture

Comprehensive architecture documentation for the PRIMA (Patient Reminder and Information Management Application) healthcare platform.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Pattern](#architecture-pattern)
- [Technology Stack](#technology-stack)
- [Layered Architecture](#layered-architecture)
- [Integration Points](#integration-points)
- [Data Flow](#data-flow)
- [Authentication & Authorization](#authentication--authorization)
- [Message Processing](#message-processing)
- [Caching Strategy](#caching-strategy)
- [Performance Optimizations](#performance-optimizations)
- [Security](#security)
- [Deployment](#deployment)
- [Monitoring & Observability](#monitoring--observability)

---

## System Overview

PRIMA is a **monolithic full-stack web application** built for healthcare providers to manage cancer patient reminders and educational content via WhatsApp messaging.

### Core Capabilities

1. **Patient Management** - Track patient demographics, medical history, and verification status
2. **Reminder System** - Schedule and send automated medication/appointment reminders
3. **WhatsApp Integration** - Bi-directional messaging via GOWA (go-whatsapp-web-multidevice)
4. **AI-Powered Conversations** - Claude-powered intent detection and response handling
5. **CMS** - Manage educational articles and videos for patient education
6. **Compliance Tracking** - Monitor patient response rates and engagement metrics

### Key Metrics (Current Scale)

- **Patients:** ~150 active patients
- **Reminders:** ~450 scheduled reminders
- **Daily Messages:** 20-30 WhatsApp messages
- **Users:** 10-15 volunteer users
- **API Endpoints:** 46 routes
- **Components:** 94 React components
- **Database Tables:** 12 tables

---

## Architecture Pattern

### Monolithic Layered Architecture

PRIMA follows a **3-tier layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│  (Next.js App Router + React Client)    │
├─────────────────────────────────────────┤
│           API Layer (Routes)            │
│     (Thin Controllers + Validation)     │
├─────────────────────────────────────────┤
│          Service Layer (Logic)          │
│   (Business Rules + Orchestration)      │
├─────────────────────────────────────────┤
│         Data Layer (Repository)         │
│    (Drizzle ORM + Database Access)      │
└─────────────────────────────────────────┘
```

### Design Principles

1. **Thin Controllers** - API routes validate input and delegate to services
2. **Fat Services** - Business logic lives in service layer, not controllers
3. **Type Safety** - TypeScript strict mode, Zod validation, Drizzle ORM
4. **DRY** - Reusable utilities, helpers, and validation schemas
5. **Separation of Concerns** - Each layer has single responsibility
6. **Testability** - Services are stateless and easily testable

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.4.10 | Full-stack React framework (App Router) |
| **React** | 19.1.1 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Radix UI** | Latest | Accessible UI primitives |
| **Lucide React** | 0.539.0 | Icon library |
| **React Hook Form** | 7.62.0 | Form state management |
| **Zod** | 4.0.17 | Schema validation |
| **Sonner** | 2.0.7 | Toast notifications |
| **Quill** | 2.0.3 | Rich text editor |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Bun** | Latest | JavaScript runtime (replaces Node.js) |
| **Drizzle ORM** | 0.33.0 | Type-safe database ORM |
| **PostgreSQL** | Latest | Primary database (Neon hosted) |
| **Redis** | Latest | Caching & rate limiting |
| **MinIO** | 8.0.5 | Object storage (S3-compatible) |

### Authentication & Messaging

| Service | Purpose |
|---------|---------|
| **Clerk** | User authentication & management |
| **GOWA** | WhatsApp messaging (go-whatsapp-web-multidevice) |
| **Anthropic Claude** | AI-powered conversation handling |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing |
| **ESLint** | Code linting |
| **Drizzle Kit** | Database migrations |
| **Next.js Turbopack** | Fast development builds |

---

## Layered Architecture

### Layer 1: Presentation Layer

**Location:** `src/app/` (pages) + `src/components/`

**Responsibilities:**
- Render UI components
- Handle user interactions
- Client-side routing
- Form validation (client-side)
- Display loading/error states

**Key Files:**
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/patients/[id]/page.tsx` - Patient detail page
- `src/components/*` - Reusable UI components

**Technologies:**
- Next.js App Router (React Server Components + Client Components)
- Tailwind CSS for styling
- React Hook Form + Zod for forms

---

### Layer 2: API Layer (Thin Controllers)

**Location:** `src/app/api/**/route.ts`

**Responsibilities:**
- Receive HTTP requests
- Validate request data (Zod schemas)
- Authentication & authorization checks
- Delegate to service layer
- Format responses (JSON)
- Error handling

**Pattern:**
```typescript
// Example: src/app/api/patients/route.ts
export const GET = createApiHandler(
  { 
    auth: "required",
    cache: { ttl: 900, key: "patients-list" }
  },
  async (data, { user, request }) => {
    // 1. Parse and validate input
    const filters = parseFilters(request)
    
    // 2. Check authorization
    if (user.role !== "ADMIN") {
      filters.assignedVolunteerId = user.id
    }
    
    // 3. Delegate to service
    const service = new PatientService()
    return await service.listWithCompliance(filters)
  }
)
```

**Key Utilities:**
- `createApiHandler` - Wrapper for consistent error handling
- `src/lib/api-schemas.ts` - Zod validation schemas
- `src/lib/error-handler.ts` - Error formatting
- `src/middleware.ts` - Clerk authentication middleware

---

### Layer 3: Service Layer (Business Logic)

**Location:** `src/services/`

**Responsibilities:**
- Implement business rules
- Orchestrate multiple data operations
- Call external APIs (WhatsApp, AI)
- Handle complex workflows
- Return typed data

**Service Organization:**

```
src/services/
├── ai/                       # AI/Claude integration
│   ├── ai-client.ts          # Anthropic API client
│   ├── ai-conversation.service.ts
│   ├── ai-intent.service.ts
│   └── ai-prompts.ts
├── patient/                  # Patient domain
│   ├── patient.service.ts    # Main patient operations
│   ├── patient.repository.ts # Database queries
│   ├── patient-lookup.service.ts
│   ├── compliance.service.ts
│   └── patient.types.ts
├── reminder/                 # Reminder domain
│   ├── reminder.service.ts
│   ├── reminder.repository.ts
│   ├── reminder-templates.service.ts
│   └── context-aware-confirmations.service.ts
├── verification/             # Patient verification
│   └── simple-verification.service.ts
└── whatsapp/                 # WhatsApp messaging
    └── whatsapp.service.ts
```

**Example Service:**
```typescript
// src/services/patient/patient.service.ts
export class PatientService {
  private repository = new PatientRepository()
  private complianceService = new ComplianceService()
  
  async listWithCompliance(filters: PatientFilters) {
    // Get patients from DB
    const patients = await this.repository.findAll(filters)
    
    // Enrich with compliance data
    const enriched = await Promise.all(
      patients.map(async (p) => ({
        ...p,
        compliance: await this.complianceService.calculate(p.id)
      }))
    )
    
    return { patients: enriched, total: patients.length }
  }
}
```

---

### Layer 4: Data Layer (Repository Pattern)

**Location:** `src/db/` + `src/services/*/repository.ts`

**Responsibilities:**
- Execute database queries (Drizzle ORM)
- Handle transactions
- Manage database connections
- Implement data access patterns
- Return typed entities

**Database Schema Organization:**

```
src/db/
├── schema.ts               # Main export + relations
├── core-schema.ts          # Users, Patients, Medical Records
├── reminder-schema.ts      # Reminders, Confirmations, Templates
├── content-schema.ts       # CMS Articles, Videos
├── enums.ts                # PostgreSQL enums
└── index.ts                # Database connection
```

**Example Repository:**
```typescript
// src/services/patient/patient.repository.ts
export class PatientRepository {
  async findAll(filters: PatientFilters) {
    return await db.query.patients.findMany({
      where: and(
        eq(patients.isActive, true),
        isNull(patients.deletedAt),
        filters.search 
          ? ilike(patients.name, `%${filters.search}%`)
          : undefined
      ),
      with: {
        assignedVolunteer: true,
        reminders: { limit: 10 }
      },
      limit: filters.limit,
      offset: (filters.page - 1) * filters.limit
    })
  }
}
```

---

## Integration Points

### Clerk Authentication

**Purpose:** User authentication and session management

**Integration:**
- Middleware: `src/middleware.ts` protects routes
- Webhook: `src/app/api/webhooks/clerk/route.ts` syncs users
- Client: `@clerk/nextjs` React components

**User Flow:**
1. User signs up → Clerk creates account
2. Webhook fires → Creates user in local DB
3. Admin approves → User gains access
4. Login → Clerk session + DB lookup

**Configuration:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
```

---

### GOWA (WhatsApp)

**Purpose:** Send/receive WhatsApp messages via HTTP API

**Integration:**
- Client: `src/lib/gowa.ts`
- Webhook: `src/app/api/webhooks/gowa/route.ts`
- Service: `src/services/whatsapp/whatsapp.service.ts`

**Message Flow:**

**Outbound (PRIMA → Patient):**
```
Reminder Service
    ↓
GOWA Client (HTTP POST)
    ↓
GOWA Server
    ↓
WhatsApp
    ↓
Patient Phone
```

**Inbound (Patient → PRIMA):**
```
Patient Phone
    ↓
WhatsApp
    ↓
GOWA Server
    ↓
GOWA Webhook (POST /api/webhooks/gowa)
    ↓
Intent Detection (AI)
    ↓
Response Handler
    ↓
Action (Confirm reminder, Unsubscribe, etc.)
```

**Configuration:**
```env
GOWA_API_URL=https://your-gowa-instance.com
GOWA_API_KEY=your-api-key
GOWA_SESSION=default
```

**Key Features:**
- Idempotency protection (Redis-based)
- Rate limiting (10 msg/min per phone)
- Message queuing
- Delivery tracking

---

### Anthropic Claude (AI)

**Purpose:** Natural language understanding and response generation

**Integration:**
- Client: `src/services/ai/ai-client.ts`
- Services: `src/services/ai/*.service.ts`

**Use Cases:**
1. **Intent Detection** - Classify incoming messages (confirmation, question, unsubscribe)
2. **Conversation Handling** - Multi-turn dialogs with patients
3. **General Inquiries** - Answer patient questions about health
4. **Sentiment Analysis** - Detect distress/urgency

**Example Flow:**
```typescript
// src/services/ai/ai-intent.service.ts
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 200,
  messages: [{
    role: "user",
    content: `Classify this message: "${patientMessage}"`
  }]
})

const intent = parseIntent(response.content)
// → "confirmation_positive", "general_inquiry", "unsubscribe"
```

**Configuration:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

---

### Redis Cache & Rate Limiting

**Purpose:** Performance optimization and abuse prevention

**Integration:**
- Client: `ioredis` package
- Utilities: `src/lib/rate-limiter.ts`, `src/lib/cache.ts`
- Idempotency: `src/lib/idempotency.ts`

**Use Cases:**

1. **Caching:**
```typescript
// Cache dashboard stats for 15 minutes
const stats = await getCachedValue(
  "dashboard:stats",
  () => fetchDashboardStats(),
  { ttl: 900 }
)
```

2. **Rate Limiting:**
```typescript
// Limit WhatsApp webhook to 10 req/min per phone
await checkRateLimit(`webhook:${phoneNumber}`, {
  limit: 10,
  window: 60
})
```

3. **Idempotency:**
```typescript
// Prevent duplicate message processing
await ensureIdempotent(`msg:${messageId}`, async () => {
  await processMessage(message)
})
```

**Configuration:**
```env
REDIS_URL=redis://localhost:6379
```

---

### MinIO (Object Storage)

**Purpose:** Store patient photos, article images, video thumbnails

**Integration:**
- Client: `minio` package
- Upload endpoint: `src/app/api/upload/route.ts`

**File Upload Flow:**
```
Client (Form)
    ↓
POST /api/upload (multipart/form-data)
    ↓
Validate file (size, type)
    ↓
Generate UUID filename
    ↓
Upload to MinIO bucket
    ↓
Return public URL
```

**Configuration:**
```env
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=prima-uploads
```

---

## Data Flow

### Request Lifecycle

**1. User Request**
```
User Browser → Next.js Server (App Router)
```

**2. Authentication**
```
Middleware (src/middleware.ts)
    ↓
Check Clerk session
    ↓
Lookup user in DB
    ↓
Attach user to request context
```

**3. Route Handler**
```
API Route (src/app/api/*/route.ts)
    ↓
Validate request (Zod)
    ↓
Check authorization (role-based)
    ↓
Call service layer
```

**4. Service Layer**
```
Service (src/services/*/service.ts)
    ↓
Execute business logic
    ↓
Call repository/external APIs
    ↓
Transform data
    ↓
Return result
```

**5. Response**
```
Service → Route Handler → Next.js → User Browser
```

---

### Reminder Processing Flow

**Scheduled Reminder (Cron Job):**

```
1. Vercel Cron Trigger (UTC 00:00, 08:00, 12:00)
   ↓
2. GET /api/cron (with CRON_SECRET)
   ↓
3. ReminderService.processScheduled()
   ↓
4. Query reminders due today
   ↓
5. For each reminder:
      ↓
   5a. Format message (template + variables)
      ↓
   5b. Send via GOWA API
      ↓
   5c. Update reminder status (SENT)
      ↓
   5d. Log event (reminderLogs table)
   ↓
6. Return summary (sent: 25, failed: 2)
```

**Manual Instant Send:**

```
1. User clicks "Send All Now" button
   ↓
2. POST /api/reminders/instant-send-all
   ↓
3. ReminderService.sendAllPending()
   ↓
4. Same as steps 4-6 above
```

---

### WhatsApp Message Handling Flow

**Incoming Message from Patient:**

```
1. Patient sends WhatsApp message
   ↓
2. GOWA receives message → POST /api/webhooks/gowa
   ↓
3. Idempotency check (Redis)
   ↓
4. Rate limit check (10 msg/min)
   ↓
5. Identify patient (phone number lookup)
   ↓
6. AI Intent Detection
   ↓
7. Route to handler:
      ├─ Confirmation → Update reminder status
      ├─ Unsubscribe → Deactivate patient
      ├─ Question → AI response
      └─ Unclear → Request clarification
   ↓
8. Send response (if needed)
   ↓
9. Log conversation (conversationMessages)
   ↓
10. Return 200 OK to GOWA
```

**Intent Detection Logic:**

```typescript
const message = "Ya saya sudah minum obat"

AI Analysis:
- Intent: confirmation_positive
- Confidence: 95%
- Context: medication_reminder

Action:
- Find pending reminder for this patient
- Update confirmationStatus = "CONFIRMED"
- Send thank you message
```

---

## Authentication & Authorization

### Authentication Flow (Clerk)

```
1. User visits PRIMA → Clerk checks session
   ↓
2. No session → Redirect to /sign-in
   ↓
3. User logs in (email/password)
   ↓
4. Clerk creates session → Redirects to app
   ↓
5. Middleware checks session on each request
   ↓
6. Lookup user in local DB
   ↓
7. Attach user object to request context
```

### Authorization Patterns

**1. Role-Based Access Control (RBAC)**

```typescript
// Middleware checks
if (!user.isApproved) {
  return redirect('/pending-approval')
}

// Route-level checks
if (user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
  throw new Error('Insufficient permissions')
}
```

**2. Resource-Based Access Control**

```typescript
// RELAWAN can only access assigned patients
if (user.role === 'RELAWAN') {
  const patient = await db.query.patients.findFirst({
    where: and(
      eq(patients.id, patientId),
      eq(patients.assignedVolunteerId, user.id)
    )
  })
  
  if (!patient) {
    throw new Error('Patient not found or not assigned')
  }
}
```

**3. Internal API Key Bypass**

```typescript
// Cron jobs and webhooks can bypass Clerk auth
const apiKey = request.headers.get('X-API-Key')
if (apiKey === process.env.INTERNAL_API_KEY) {
  // Allow access without user session
  return processRequest()
}
```

### User Approval Workflow

```
1. User signs up → Clerk creates account
   ↓
2. Webhook creates DB user (isApproved = false)
   ↓
3. User sees "Pending Approval" page
   ↓
4. Admin views pending users
   ↓
5. Admin clicks "Approve" → isApproved = true
   ↓
6. User gains full access on next login
```

---

## Message Processing

### Idempotency Protection

**Problem:** Webhooks can be delivered multiple times (network retries, etc.)

**Solution:** Redis-based atomic idempotency check

```typescript
// src/lib/idempotency.ts
export async function ensureIdempotent(
  key: string,
  fn: () => Promise<void>,
  ttl = 3600
) {
  const redis = getRedisClient()
  
  // Try to set key (NX = only if not exists)
  const result = await redis.set(key, '1', 'EX', ttl, 'NX')
  
  if (!result) {
    // Key already exists → duplicate request
    console.log(`Idempotent: Skipping duplicate ${key}`)
    return
  }
  
  // First time seeing this key → process
  await fn()
}

// Usage in webhook
await ensureIdempotent(`gowa:${messageId}`, async () => {
  await handleIncomingMessage(message)
})
```

---

### Rate Limiting

**Strategy:** Token bucket algorithm with Redis

```typescript
// src/lib/rate-limiter.ts
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
) {
  const redis = getRedisClient()
  const key = `ratelimit:${identifier}`
  
  // Increment counter
  const count = await redis.incr(key)
  
  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, windowSeconds)
  }
  
  // Check limit
  if (count > limit) {
    throw new RateLimitError(`Rate limit exceeded: ${limit}/${windowSeconds}s`)
  }
}
```

**Applied Limits:**
- WhatsApp webhook: 10 messages/minute per phone number
- API endpoints: 100 requests/minute per user
- Cron jobs: 1 concurrent execution (lock-based)

---

### Message Queuing

**Current:** Synchronous processing (scale: 20-30 messages/day)

**Future Enhancement (if scale increases):**
```
Producer (Webhook) → Redis Queue → Worker Process → Database
```

---

## Caching Strategy

### Cache Layers

**1. Database Query Results (Redis)**

```typescript
// Example: Cache patient list for 15 minutes
const cacheKey = `patients:list:${JSON.stringify(filters)}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const result = await db.query.patients.findMany(...)
await redis.setex(cacheKey, 900, JSON.stringify(result))
```

**2. React Server Component Caching (Next.js)**

```typescript
// Cached at build time, revalidated on-demand
export const revalidate = 900 // 15 minutes

export default async function PatientList() {
  const patients = await fetchPatients() // Cached by Next.js
  return <List patients={patients} />
}
```

**3. Client-Side Caching (React Query)**

```typescript
// Frontend caching with stale-while-revalidate
const { data } = useQuery({
  queryKey: ['patients'],
  queryFn: fetchPatients,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 15 * 60 * 1000 // 15 minutes
})
```

### Cache Invalidation

**Manual Invalidation:**
```typescript
import { invalidateAllDashboardCaches } from '@/lib/cache'

// After creating/updating patient
await invalidateAllDashboardCaches()
```

**Time-Based Invalidation:**
- Dashboard stats: 15 minutes
- Patient list: 15 minutes
- Templates: 30 minutes
- User profile: 5 minutes

---

## Performance Optimizations

### Database Optimizations

**1. Composite Indexes (Phase 3)**
```sql
-- High-usage query patterns
CREATE INDEX reminders_patient_active_idx 
  ON reminders (patient_id, is_active);

CREATE INDEX reminders_today_idx 
  ON reminders (start_date, is_active, scheduled_time);
```

**2. Query Optimization**
```typescript
// Use Drizzle's with clause for eager loading
const patients = await db.query.patients.findMany({
  with: {
    assignedVolunteer: true,  // Single join vs N+1 queries
    reminders: { limit: 10 }
  }
})
```

**3. Pagination**
```typescript
// Always paginate large datasets
const patients = await db.query.patients.findMany({
  limit: filters.limit,  // Max 100
  offset: (filters.page - 1) * filters.limit
})
```

### Frontend Optimizations

**1. Code Splitting**
```typescript
// Lazy load admin components
const AdminPanel = dynamic(() => import('@/components/admin/admin-panel'), {
  loading: () => <LoadingSpinner />
})
```

**2. Virtual Lists**
```typescript
// Render only visible items for long lists
<VirtualList
  items={reminders}
  itemHeight={80}
  height={600}
  renderItem={(reminder) => <ReminderItem {...reminder} />}
/>
```

**3. Image Optimization**
```typescript
// Next.js automatic optimization
<Image
  src={patient.photoUrl}
  width={100}
  height={100}
  alt={patient.name}
  loading="lazy"
/>
```

### API Optimizations

**1. Caching Headers**
```typescript
export const GET = createApiHandler(
  { cache: { ttl: 900, key: "patients-list" } },
  async () => {
    // Response cached for 15 minutes
  }
)
```

**2. Compression**
```javascript
// next.config.ts
export default {
  compress: true,  // Gzip compression
}
```

**3. Turbopack (Dev Mode)**
```json
{
  "scripts": {
    "dev": "next dev --turbo"  // Faster builds
  }
}
```

---

## Security

### Input Validation

**All inputs validated with Zod schemas:**

```typescript
// src/lib/api-schemas.ts
export const createPatientBodySchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string()
    .transform((val) => normalizePhone(val))
    .refine((val) => /^62\d{9,12}$/.test(val)),
  // ... more fields
})

// Usage in route
const body = createPatientBodySchema.parse(await request.json())
```

### SQL Injection Prevention

**Drizzle ORM provides parameterized queries:**

```typescript
// Safe: Drizzle uses prepared statements
const patient = await db.query.patients.findFirst({
  where: eq(patients.id, patientId)  // Parameterized
})

// Unsafe: Never do this
const result = await db.execute(
  sql`SELECT * FROM patients WHERE id = ${patientId}`  // Vulnerable
)
```

### XSS Prevention

**1. React auto-escapes by default**
```tsx
// Safe: React escapes HTML entities
<div>{patient.name}</div>

// Unsafe: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: untrustedHTML }} />
```

**2. Content Security Policy (CSP)**
```typescript
// next.config.ts
export default {
  headers: async () => [{
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'"
      }
    ]
  }]
}
```

### Authentication Security

**1. Clerk Session Security**
- HTTPOnly cookies
- CSRF protection
- Automatic token rotation

**2. API Key Management**
```typescript
// Never expose in client
const apiKey = process.env.INTERNAL_API_KEY  // Server-side only
```

**3. Rate Limiting**
- Prevents brute force attacks
- Protects against DoS

---

## Deployment

### Current Deployment (Vercel)

```
GitHub Repository
    ↓
Push to main branch
    ↓
Vercel CI/CD
    ↓
Build (bun build)
    ↓
Deploy to Production
    ↓
Update environment variables
    ↓
Run database migrations
```

### Environment Variables

**Required for Production:**

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# WhatsApp
GOWA_API_URL=https://...
GOWA_API_KEY=...
GOWA_SESSION=default

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Storage
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...

# Caching
REDIS_URL=redis://...

# Internal
INTERNAL_API_KEY=...
CRON_SECRET=...
```

### Database Migrations

```bash
# Generate migration from schema changes
bunx drizzle-kit generate

# Review SQL in drizzle/migrations/

# Apply to production database
bunx drizzle-kit push
```

### Cron Jobs (Vercel Cron)

**vercel.json:**
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

---

## Monitoring & Observability

### Logging

**Structured Logging:**
```typescript
// src/lib/logger.ts
import { createLogger } from '@/lib/logger'

const logger = createLogger('ReminderService')

logger.info('Processing reminders', { count: 25 })
logger.error('Failed to send reminder', { 
  reminderId, 
  error: error.message 
})
```

### Error Tracking

**1. Client-Side Error Boundary**
```tsx
<EnhancedErrorBoundary>
  <App />
</EnhancedErrorBoundary>
```

**2. API Error Handling**
```typescript
try {
  await processReminders()
} catch (error) {
  logger.error('Cron job failed', { error })
  // Could send to Sentry, etc.
  throw error
}
```

### Performance Monitoring

**Web Vitals:**
```tsx
// src/components/performance/web-vitals.tsx
<WebVitals onReport={(metric) => {
  // Send to analytics
  console.log(metric.name, metric.value)
}} />
```

**API Performance:**
```typescript
const start = Date.now()
const result = await service.process()
const duration = Date.now() - start

logger.info('Request completed', { 
  endpoint: '/api/patients',
  duration 
})
```

### Health Checks

**Kubernetes/Docker Ready Probe:**
```bash
GET /api/health/ready

Response: 200 OK
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## Future Enhancements

### Scalability Considerations

**If traffic increases 10x:**

1. **Database:**
   - Add read replicas
   - Implement connection pooling
   - Shard by region/hospital

2. **Message Queue:**
   - Replace sync processing with Bull/BullMQ
   - Separate worker processes
   - Horizontal scaling

3. **Caching:**
   - Redis Cluster for high availability
   - CDN for static assets
   - Edge caching (Vercel Edge Functions)

4. **Microservices (if needed):**
   ```
   Monolith → Split into:
   - API Gateway
   - Patient Service
   - Reminder Service
   - WhatsApp Service
   - AI Service
   ```

### Monitoring Improvements

- **APM:** Add Datadog/New Relic for detailed performance metrics
- **Alerting:** PagerDuty for critical errors
- **Analytics:** Mixpanel/Amplitude for user behavior
- **Logs:** Centralized logging with ELK stack

---

**Architecture Version:** Phase 3 (Optimized)  
**Last Updated:** January 29, 2026  
**Scale:** 150 patients, 450 reminders, 10-15 users  
**Deployment:** Vercel (Next.js), Neon (PostgreSQL), Redis Cloud  
**Team:** Small team (2-5 developers)
