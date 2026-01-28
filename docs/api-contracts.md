# PRIMA API Contracts

Complete API documentation for the PRIMA healthcare platform. All endpoints follow RESTful conventions and use JSON for request/response bodies.

## Table of Contents

- [Authentication](#authentication)
- [Admin Endpoints](#admin-endpoints)
- [Auth Endpoints](#auth-endpoints)
- [CMS Endpoints](#cms-endpoints)
- [Cron Endpoints](#cron-endpoints)
- [Dashboard Endpoints](#dashboard-endpoints)
- [Debug Endpoints](#debug-endpoints)
- [Health Endpoints](#health-endpoints)
- [Patient Endpoints](#patient-endpoints)
- [Reminder Endpoints](#reminder-endpoints)
- [Template Endpoints](#template-endpoints)
- [Test Endpoints](#test-endpoints)
- [Upload Endpoints](#upload-endpoints)
- [User Endpoints](#user-endpoints)
- [Webhook Endpoints](#webhook-endpoints)
- [YouTube Endpoints](#youtube-endpoints)

---

## Authentication

All authenticated endpoints require either:

1. **Clerk Session** - User must be logged in via Clerk auth (cookie-based)
2. **Internal API Key** - `X-API-Key` header with `INTERNAL_API_KEY` environment variable

### Authorization Headers

```http
X-API-Key: your-internal-api-key
```

Or authenticated via Clerk session cookies.

---

## Admin Endpoints

### GET /api/admin/users

List all users for admin management.

**Auth:** Required (ADMIN or DEVELOPER role)

**Query Parameters:**

- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 1000) - Items per page
- `search` (string, optional) - Search by email
- `status` (enum: "all" | "pending" | "approved", default: "all")

**Response:** 200 OK

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "RELAWAN",
      "isActive": true,
      "isApproved": true,
      "approvedAt": "2025-01-15T10:30:00Z",
      "approverFirstName": "Admin",
      "approverLastName": "User",
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### PUT /api/admin/users/[userId]

Update user details (admin only).

**Auth:** Required (ADMIN or DEVELOPER role)

**Path Parameters:**

- `userId` (uuid) - User ID

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "ADMIN",
  "isActive": true,
  "isApproved": true
}
```

**Response:** 200 OK

```json
{
  "message": "User updated successfully",
  "user": {
    /* updated user object */
  }
}
```

### GET /api/admin/verification-analytics

Get verification statistics for admin dashboard.

**Auth:** Required (ADMIN or DEVELOPER role)

**Response:** 200 OK

```json
{
  "stats": {
    "totalPatients": 150,
    "verified": 120,
    "pending": 20,
    "declined": 5,
    "expired": 5,
    "verificationRate": 80.0
  }
}
```

### GET /api/admin/templates

List WhatsApp message templates.

**Auth:** Required (ADMIN or DEVELOPER role)

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Response:** 200 OK

```json
{
  "templates": [
    {
      "id": "uuid",
      "templateName": "Medication Reminder",
      "templateText": "Hi {patientName}, reminder to take {medication}",
      "variables": ["patientName", "medication"],
      "category": "MEDICATION",
      "isActive": true,
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ],
  "total": 10
}
```

### POST /api/admin/templates

Create a new WhatsApp template.

**Auth:** Required (ADMIN or DEVELOPER role)

**Request Body:**

```json
{
  "name": "Appointment Reminder",
  "message": "Hi {patientName}, your appointment is on {date}",
  "type": "REMINDER",
  "isActive": true
}
```

**Response:** 201 Created

```json
{
  "message": "Template created successfully",
  "template": {
    /* created template object */
  }
}
```

### PUT /api/admin/templates/[id]

Update a WhatsApp template.

**Auth:** Required (ADMIN or DEVELOPER role)

**Path Parameters:**

- `id` (uuid) - Template ID

**Request Body:**

```json
{
  "name": "Updated Template Name",
  "message": "Updated message content",
  "isActive": false
}
```

**Response:** 200 OK

```json
{
  "message": "Template updated successfully",
  "template": {
    /* updated template */
  }
}
```

### DELETE /api/admin/templates/[id]

Soft delete a template.

**Auth:** Required (ADMIN or DEVELOPER role)

**Path Parameters:**

- `id` (uuid) - Template ID

**Response:** 200 OK

```json
{
  "message": "Template deleted successfully"
}
```

### POST /api/admin/templates/seed

Seed default WhatsApp templates.

**Auth:** Required (ADMIN or DEVELOPER role)

**Response:** 200 OK

```json
{
  "message": "Templates seeded successfully",
  "count": 5
}
```

### POST /api/admin/sync-clerk

Manually trigger Clerk user sync.

**Auth:** Required (ADMIN or DEVELOPER role)

**Response:** 200 OK

```json
{
  "message": "Clerk sync completed",
  "synced": 10
}
```

### GET /api/admin/developer-contact

Get developer contact information.

**Auth:** Required (ADMIN or DEVELOPER role)

**Response:** 200 OK

```json
{
  "contact": {
    "name": "Developer Name",
    "email": "dev@example.com",
    "phone": "+62123456789"
  }
}
```

---

## Auth Endpoints

### POST /api/auth/update-last-login

Update user's last login timestamp.

**Auth:** Required

**Response:** 200 OK

```json
{
  "message": "Last login updated"
}
```

### GET /api/auth/clear-cache

Clear user authentication cache.

**Auth:** Required

**Response:** 200 OK

```json
{
  "message": "Cache cleared successfully"
}
```

### GET /api/auth/debug

Debug authentication state.

**Auth:** Required (DEVELOPER role)

**Response:** 200 OK

```json
{
  "clerkUser": {
    /* Clerk user object */
  },
  "dbUser": {
    /* Database user object */
  },
  "session": {
    /* Session info */
  }
}
```

---

## CMS Endpoints

### GET /api/cms/articles

List CMS articles with pagination and filtering.

**Auth:** Optional (public content visible to all)

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `search` (string, optional) - Search in title/content
- `category` (enum: "GENERAL" | "NUTRITION" | "EXERCISE" | "MOTIVATIONAL" | "MEDICAL" | "FAQ")
- `status` (enum: "DRAFT" | "PUBLISHED" | "ARCHIVED")

**Response:** 200 OK

```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "Managing Cancer Treatment Side Effects",
      "slug": "managing-cancer-treatment-side-effects",
      "excerpt": "Learn practical tips...",
      "featuredImageUrl": "https://...",
      "category": "MEDICAL",
      "tags": ["cancer", "treatment", "tips"],
      "status": "PUBLISHED",
      "publishedAt": "2025-01-15T10:00:00Z",
      "createdBy": "clerk-user-id",
      "createdAt": "2025-01-14T08:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### POST /api/cms/articles

Create a new article.

**Auth:** Required (ADMIN or DEVELOPER role)

**Request Body:**

```json
{
  "title": "New Article Title",
  "slug": "new-article-title",
  "content": "<p>Article content in HTML</p>",
  "excerpt": "Short description...",
  "featuredImageUrl": "https://...",
  "category": "NUTRITION",
  "tags": ["nutrition", "health"],
  "seoTitle": "SEO optimized title",
  "seoDescription": "Meta description...",
  "status": "DRAFT"
}
```

**Response:** 201 Created

```json
{
  "message": "Article created successfully",
  "article": {
    /* created article */
  }
}
```

### GET /api/cms/articles/[id]

Get a single article by ID.

**Auth:** Optional

**Path Parameters:**

- `id` (uuid) - Article ID

**Response:** 200 OK

```json
{
  "id": "uuid",
  "title": "Article Title",
  "content": "<p>Full content...</p>"
  /* ... all article fields ... */
}
```

### PUT /api/cms/articles/[id]

Update an article.

**Auth:** Required (ADMIN or DEVELOPER role)

**Path Parameters:**

- `id` (uuid) - Article ID

**Request Body:** (Same as POST, all fields optional)

**Response:** 200 OK

```json
{
  "message": "Article updated successfully",
  "article": {
    /* updated article */
  }
}
```

### DELETE /api/cms/articles/[id]

Soft delete an article.

**Auth:** Required (ADMIN or DEVELOPER role)

**Path Parameters:**

- `id` (uuid) - Article ID

**Response:** 200 OK

```json
{
  "message": "Article deleted successfully"
}
```

### GET /api/cms/videos

List CMS videos with pagination and filtering.

**Auth:** Optional

**Query Parameters:** (Same as articles endpoint)

**Response:** 200 OK

```json
{
  "videos": [
    {
      "id": "uuid",
      "title": "Exercise Tips for Cancer Patients",
      "slug": "exercise-tips-cancer-patients",
      "videoUrl": "https://www.youtube.com/embed/VIDEO_ID",
      "thumbnailUrl": "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
      "durationMinutes": "5:30",
      "category": "EXERCISE",
      "tags": ["exercise", "health"],
      "status": "PUBLISHED",
      "publishedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 30,
  "page": 1,
  "limit": 20
}
```

### POST /api/cms/videos

Create a new video.

**Auth:** Required (ADMIN or DEVELOPER role)

**Request Body:**

```json
{
  "title": "Video Title",
  "slug": "video-title",
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "description": "Video description...",
  "category": "MOTIVATIONAL",
  "tags": ["motivation", "inspiration"],
  "status": "DRAFT"
}
```

**Note:** The API automatically converts YouTube/Vimeo URLs to embed format and extracts thumbnails.

**Response:** 201 Created

```json
{
  "message": "Video created successfully",
  "video": {
    /* created video with processed URLs */
  }
}
```

### GET /api/cms/videos/[id]

Get a single video by ID.

**Auth:** Optional

**Path Parameters:**

- `id` (uuid) - Video ID

**Response:** 200 OK

### PUT /api/cms/videos/[id]

Update a video.

**Auth:** Required (ADMIN or DEVELOPER role)

### DELETE /api/cms/videos/[id]

Soft delete a video.

**Auth:** Required (ADMIN or DEVELOPER role)

### GET /api/cms/content

Combined endpoint for both articles and videos.

**Auth:** Optional

**Query Parameters:**

- `type` (enum: "article" | "video", optional) - Filter by content type
- `page`, `limit`, `search`, `category`, `status` (same as individual endpoints)

**Response:** 200 OK

```json
{
  "content": [
    { "type": "article" /* article fields */ },
    { "type": "video" /* video fields */ }
  ],
  "total": 80,
  "page": 1,
  "limit": 20
}
```

---

## Cron Endpoints

### GET /api/cron

Trigger scheduled reminder processing.

**Auth:** Internal API Key required

**Query Parameters:**

- `force` (boolean, default: false) - Force execution even if already running

**Response:** 200 OK

```json
{
  "message": "Cron job completed",
  "processed": 25,
  "sent": 23,
  "failed": 2
}
```

### POST /api/cron

Alternative POST endpoint for cron job (same as GET).

**Auth:** Internal API Key required

### GET /api/cron/cleanup-conversations

Clean up expired conversation states.

**Auth:** Internal API Key required

**Response:** 200 OK

```json
{
  "message": "Cleanup completed",
  "deleted": 15
}
```

---

## Dashboard Endpoints

### GET /api/dashboard/overview

Get dashboard overview statistics with caching.

**Auth:** Required

**Response:** 200 OK

```json
{
  "stats": {
    "totalPatients": 150,
    "activePatients": 130,
    "totalReminders": 450,
    "sentToday": 25,
    "pendingReminders": 12,
    "complianceRate": 85.5,
    "verificationRate": 78.0
  },
  "recentActivity": [
    {
      "type": "reminder_sent",
      "patientName": "Patient Name",
      "timestamp": "2025-01-29T08:30:00Z"
    }
  ]
}
```

---

## Debug Endpoints

### GET /api/debug/webhook

Get webhook debug information.

**Auth:** Required (DEVELOPER role)

**Response:** 200 OK

```json
{
  "webhookUrl": "https://app.example.com/api/webhooks/gowa",
  "environment": "production",
  "lastReceived": "2025-01-29T08:30:00Z"
}
```

### GET /api/debug/clear-cache

Clear all application caches.

**Auth:** Required (DEVELOPER role)

**Response:** 200 OK

```json
{
  "message": "All caches cleared",
  "cleared": ["dashboard", "patients", "reminders"]
}
```

---

## Health Endpoints

### GET /api/health

Basic health check endpoint.

**Auth:** None

**Response:** 200 OK

```json
{
  "status": "ok",
  "timestamp": "2025-01-29T10:00:00Z",
  "version": "0.1.0"
}
```

### GET /api/health/ready

Comprehensive readiness check with dependency verification.

**Auth:** None

**Response:** 200 OK

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "clerk": "ok",
    "gowa": "ok"
  },
  "timestamp": "2025-01-29T10:00:00Z"
}
```

**Response:** 503 Service Unavailable (if any check fails)

---

## Patient Endpoints

### GET /api/patients

List patients with compliance rates.

**Auth:** Required

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 50, max: 100)
- `search` (string, optional) - Search by name/phone
- `status` (enum: "active" | "inactive" | "all", default: "all")
- `includeDeleted` (boolean, default: false)

**Access Control:** RELAWAN users only see their assigned patients.

**Response:** 200 OK

```json
{
  "patients": [
    {
      "id": "uuid",
      "name": "John Doe",
      "phoneNumber": "628123456789",
      "address": "Jakarta",
      "cancerStage": "II",
      "assignedVolunteerId": "uuid",
      "assignedVolunteerName": "Volunteer Name",
      "isActive": true,
      "verificationStatus": "VERIFIED",
      "compliance": {
        "total": 30,
        "confirmed": 25,
        "rate": 83.33
      },
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

### POST /api/patients

Create a new patient.

**Auth:** Required

**Request Body:**

```json
{
  "name": "Jane Smith",
  "phoneNumber": "0812-3456-7890",
  "address": "Jakarta Selatan",
  "birthDate": "1985-05-15",
  "diagnosisDate": "2024-12-01",
  "cancerStage": "II",
  "emergencyContactName": "John Smith",
  "emergencyContactPhone": "0811-1111-1111",
  "notes": "Patient notes...",
  "assignedVolunteerId": "uuid"
}
```

**Note:** Phone numbers are automatically normalized (0xxx → 62xxx).

**Response:** 201 Created

```json
{
  "message": "Patient created successfully",
  "patient": {
    /* created patient with normalized phone */
  }
}
```

### GET /api/patients/with-compliance

List patients with detailed compliance metrics.

**Auth:** Required

**Response:** 200 OK (similar to GET /api/patients but with extended compliance data)

### GET /api/patients/[id]

Get a single patient by ID.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Access Control:** RELAWAN can only access their assigned patients.

**Response:** 200 OK

```json
{
  "id": "uuid",
  "name": "John Doe",
  "phoneNumber": "628123456789",
  /* ... all patient fields ... */
  "compliance": {
    /* compliance stats */
  }
}
```

### PUT /api/patients/[id]

Update a patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Request Body:** (Same as POST, all fields optional)

**Response:** 200 OK

### DELETE /api/patients/[id]

Soft delete a patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Response:** 200 OK

### GET /api/patients/[id]/reminders

Get all reminders for a patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Query Parameters:**

- `filter` (enum: "all" | "completed" | "pending" | "scheduled")
- `date` (string, format: YYYY-MM-DD, optional)

**Response:** 200 OK

```json
{
  "reminders": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "reminderType": "MEDICATION",
      "message": "Take your medication",
      "scheduledTime": "08:00",
      "startDate": "2025-01-15T00:00:00Z",
      "endDate": "2025-02-15T00:00:00Z",
      "status": "SENT",
      "confirmationStatus": "CONFIRMED",
      "isActive": true,
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ],
  "total": 30
}
```

### POST /api/patients/[id]/reminders

Create new reminders for a patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Request Body:**

```json
{
  "message": "Remember to take your medication",
  "time": "08:00",
  "selectedDates": ["2025-02-01", "2025-02-02"],
  "customRecurrence": {
    "frequency": "day",
    "interval": 1,
    "endType": "after",
    "occurrences": 30
  },
  "attachedContent": [
    {
      "id": "uuid",
      "type": "article",
      "title": "Medication Guidelines"
    }
  ]
}
```

**Response:** 201 Created

```json
{
  "message": "Reminders created successfully",
  "count": 30,
  "reminders": [
    /* created reminder objects */
  ]
}
```

### DELETE /api/patients/[id]/reminders

Bulk delete reminders for a patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Request Body:**

```json
{
  "reminderIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:** 200 OK

```json
{
  "message": "Reminders deleted successfully",
  "count": 3
}
```

### GET /api/patients/[id]/reminders/stats

Get reminder statistics for a patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Response:** 200 OK

```json
{
  "stats": {
    "total": 50,
    "sent": 45,
    "pending": 5,
    "confirmed": 38,
    "missed": 7,
    "complianceRate": 84.44
  }
}
```

### POST /api/patients/[id]/reminders/[reminderId]/confirm

Manually confirm a reminder.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID
- `reminderId` (uuid) - Reminder ID

**Request Body:**

```json
{
  "status": "CONFIRMED",
  "notes": "Patient confirmed via phone call",
  "confirmedAt": "2025-01-29T10:00:00Z"
}
```

**Response:** 200 OK

### POST /api/patients/[id]/send-verification

Send WhatsApp verification message to patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Response:** 200 OK

```json
{
  "message": "Verification sent successfully",
  "verificationStatus": "PENDING"
}
```

### POST /api/patients/[id]/manual-verification

Manually verify a patient (bypass WhatsApp).

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Request Body:**

```json
{
  "status": "VERIFIED",
  "notes": "Verified via phone call"
}
```

**Response:** 200 OK

### GET /api/patients/[id]/verification-history

Get verification history for a patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Response:** 200 OK

```json
{
  "history": [
    {
      "status": "VERIFIED",
      "method": "whatsapp",
      "timestamp": "2025-01-20T10:00:00Z",
      "notes": "Patient responded YA"
    }
  ]
}
```

### POST /api/patients/[id]/deactivate

Deactivate a patient (unsubscribe from reminders).

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Request Body:**

```json
{
  "reason": "Patient requested to stop",
  "method": "manual"
}
```

**Response:** 200 OK

### POST /api/patients/[id]/reactivate

Reactivate a previously deactivated patient.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Response:** 200 OK

### GET /api/patients/[id]/version

Get patient data version (for optimistic locking).

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Patient ID

**Response:** 200 OK

```json
{
  "version": "2025-01-29T10:00:00.000Z",
  "updatedAt": "2025-01-29T10:00:00Z"
}
```

---

## Reminder Endpoints

### POST /api/reminders/instant-send-all

Send all pending reminders immediately (bypasses scheduled time).

**Auth:** Required (ADMIN or DEVELOPER role)

**Response:** 200 OK

```json
{
  "message": "Reminders sent",
  "sent": 15,
  "failed": 2
}
```

### GET /api/reminders/scheduled/[id]

Get a single scheduled reminder.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Reminder ID

**Response:** 200 OK

### PUT /api/reminders/scheduled/[id]

Update a scheduled reminder.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Reminder ID

**Request Body:**

```json
{
  "message": "Updated reminder message",
  "time": "09:00",
  "isActive": true
}
```

**Response:** 200 OK

### DELETE /api/reminders/scheduled/[id]

Delete a scheduled reminder.

**Auth:** Required

**Path Parameters:**

- `id` (uuid) - Reminder ID

**Response:** 200 OK

---

## Template Endpoints

### GET /api/templates

Get all WhatsApp templates with caching.

**Auth:** Required

**Response:** 200 OK

```json
{
  "templates": [
    {
      "id": "uuid",
      "templateName": "Medication Reminder",
      "templateText": "Hi {patientName}, take your {medication}",
      "variables": ["patientName", "medication"],
      "category": "MEDICATION",
      "isActive": true
    }
  ]
}
```

---

## Test Endpoints

### GET /api/test/reminder-flow

Test the reminder flow end-to-end.

**Auth:** Required (DEVELOPER role)

**Query Parameters:**

- `patientId` (uuid, optional) - Test with specific patient

**Response:** 200 OK

```json
{
  "success": true,
  "steps": [
    { "step": "Patient lookup", "status": "ok" },
    { "step": "Message formatting", "status": "ok" },
    { "step": "WhatsApp send", "status": "ok" }
  ]
}
```

---

## Upload Endpoints

### POST /api/upload

Upload files (images, documents) to MinIO storage.

**Auth:** Required

**Request:** multipart/form-data

- `file` - File to upload (max 5MB)

**Response:** 201 Created

```json
{
  "url": "https://storage.example.com/uploads/file-uuid.jpg",
  "filename": "original-filename.jpg",
  "size": 123456,
  "mimeType": "image/jpeg"
}
```

---

## User Endpoints

### GET /api/user/status

Fast user status check without caching.

**Auth:** Required

**Response:** 200 OK

```json
{
  "isApproved": true,
  "isActive": true,
  "role": "RELAWAN"
}
```

### GET /api/user/profile

Get current user profile with auto-sync from Clerk.

**Auth:** Required

**Response:** 200 OK

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "RELAWAN",
  "hospitalName": "Hospital Name",
  "isActive": true,
  "isApproved": true,
  "createdAt": "2025-01-10T08:00:00Z",
  "lastLoginAt": "2025-01-29T08:00:00Z"
}
```

### POST /api/user/session

Create or update user session.

**Auth:** Required

**Response:** 200 OK

```json
{
  "message": "Session updated",
  "user": {
    /* user object */
  }
}
```

### GET /api/user/session

Get current user session.

**Auth:** Required

**Response:** 200 OK

---

## Webhook Endpoints

### POST /api/webhooks/clerk

Handle Clerk authentication webhooks (user.created, user.updated, user.deleted).

**Auth:** Svix webhook signature verification

**Request Body:** Clerk webhook payload

**Response:** 200 OK

```json
{
  "received": true
}
```

### POST /api/webhooks/gowa

Handle GOWA (WhatsApp) webhooks for incoming messages.

**Auth:** None (public endpoint with idempotency protection)

**Request Body:**

```json
{
  "event": "message",
  "session": "default",
  "payload": {
    "from": "628123456789@c.us",
    "body": "YA",
    "timestamp": 1706515200
  }
}
```

**Features:**

- Idempotency protection using Redis
- Rate limiting (10 messages per minute per phone number)
- AI-powered intent detection
- Automatic reminder confirmation
- Patient verification handling
- Unsubscribe detection ("BERHENTI")

**Response:** 200 OK

```json
{
  "received": true,
  "processed": true
}
```

### GET /api/webhooks/gowa

Health check for GOWA webhook endpoint.

**Auth:** None

**Response:** 200 OK

```json
{
  "status": "ready",
  "webhook": "gowa"
}
```

---

## YouTube Endpoints

### POST /api/youtube/fetch

Fetch YouTube video metadata.

**Auth:** Required (ADMIN or DEVELOPER role)

**Request Body:**

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:** 200 OK

```json
{
  "title": "Video Title",
  "description": "Video description...",
  "thumbnailUrl": "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
  "duration": "PT5M30S",
  "channelTitle": "Channel Name"
}
```

---

## Error Responses

All endpoints follow consistent error response format:

### 400 Bad Request

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "phoneNumber",
      "message": "Invalid phone number format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "requestId": "req_123456"
}
```

---

## Rate Limiting

- **Webhook endpoints:** 10 requests per minute per phone number
- **API endpoints:** 100 requests per minute per user (configurable)
- **Cron endpoints:** 1 execution at a time (lock-based)

## Caching

- **Dashboard stats:** 15 minutes TTL
- **Patient list:** 15 minutes TTL
- **Templates:** 30 minutes TTL
- **User profile:** 5 minutes TTL

## Pagination

All list endpoints support pagination with:

- `page` - Page number (1-indexed)
- `limit` - Items per page (max varies by endpoint)

Response includes:

- `total` - Total number of items
- `page` - Current page
- `limit` - Items per page

---

**Last Updated:** January 29, 2026  
**API Version:** 0.1.0
