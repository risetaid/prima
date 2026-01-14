# API Contracts

## Overview

PRIMA uses Next.js App Router for API endpoints. All routes are located in `src/app/api/` and follow REST conventions.

## API Groups

### Admin API (`/api/admin/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/developer-contact` | GET/POST | Developer contact management |
| `/api/admin/sync-clerk` | POST | Sync users with Clerk |
| `/api/admin/templates` | GET/POST | Manage WhatsApp templates |
| `/api/admin/templates/seed` | POST | Seed initial templates |
| `/api/admin/templates/[id]` | GET/PATCH/DELETE | Template CRUD operations |
| `/api/admin/users` | GET/POST | User management |
| `/api/admin/users/[userId]` | GET/PATCH/DELETE | User CRUD operations |
| `/api/admin/verification-analytics` | GET | Verification analytics |

### Auth API (`/api/auth/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/clear-cache` | POST | Clear authentication cache |
| `/api/auth/debug` | GET | Debug authentication state |
| `/api/auth/update-last-login` | POST | Update last login timestamp |

### CMS API (`/api/cms/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cms/articles` | GET/POST | Article CRUD |
| `/api/cms/articles/[id]` | GET/PATCH/DELETE | Single article operations |
| `/api/cms/content` | GET/POST | Generic CMS content |
| `/api/cms/videos` | GET/POST | Video CRUD |
| `/api/cms/videos/[id]` | GET/PATCH/DELETE | Single video operations |

### Cron API (`/api/cron/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron` | GET/POST | Cron job trigger |
| `/api/cron/cleanup-conversations` | POST | Clean up expired conversations |

### Dashboard API (`/api/dashboard/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/overview` | GET | Dashboard overview data |

### Debug API (`/api/debug/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/debug/clear-cache` | POST | Clear debug cache |
| `/api/debug/webhook` | GET/POST | Webhook debugging |

### Health API (`/api/health/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic health check |
| `/api/health/ready` | GET | Readiness check |

### Patients API (`/api/patients/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patients` | GET/POST | List/create patients |
| `/api/patients/[id]` | GET/PATCH/DELETE | Patient CRUD |
| `/api/patients/[id]/deactivate` | POST | Deactivate patient |
| `/api/patients/[id]/reactivate` | POST | Reactivate patient |
| `/api/patients/[id]/reminders` | GET/POST | Patient reminders |
| `/api/patients/[id]/reminders/stats` | GET | Reminder statistics |
| `/api/patients/[id]/reminders/[reminderId]/confirm` | POST | Confirm reminder |
| `/api/patients/[id]/send-verification` | POST | Send verification |
| `/api/patients/[id]/manual-verification` | POST | Manual verification |
| `/api/patients/[id]/verification-history` | GET | Verification history |
| `/api/patients/[id]/version` | GET | Patient data version |
| `/api/patients/with-compliance` | GET | Patients with compliance data |

### Reminders API (`/api/reminders/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reminders/scheduled/[id]` | GET/PATCH/DELETE | Scheduled reminder |
| `/api/reminders/instant-send-all` | POST | Send all instant reminders |

### Templates API (`/api/templates/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET/POST | List/create templates |

### Upload API (`/api/upload/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | File upload |

### User API (`/api/user/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET/PATCH | User profile |
| `/api/user/session` | GET | Session info |
| `/api/user/status` | GET | User status |

### Webhooks API (`/api/webhooks/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/clerk` | POST | Clerk webhook handler |
| `/api/webhooks/gowa` | POST | GOWA WhatsApp webhook |

### YouTube API (`/api/youtube/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/youtube/fetch` | POST | Fetch YouTube video data |

## API Patterns

### Request/Response Format

All APIs use JSON for both requests and responses:

```typescript
// Request body
interface ApiRequest {
  // Request data
}

// Response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Validation

All inputs are validated using Zod schemas from `src/lib/api-schemas.ts`.

### Authentication

All API routes (except health checks) require authentication via Clerk middleware defined in `src/middleware.ts`.

### Rate Limiting

Sensitive endpoints are protected by Redis-based rate limiting in `src/lib/rate-limiter.ts`.

### Error Handling

Errors are handled consistently via `src/lib/error-handler.ts` helpers.

## Internal API Key

For service-to-service calls, the `X-API-Key` header with `INTERNAL_API_KEY` can be used to bypass authentication.
