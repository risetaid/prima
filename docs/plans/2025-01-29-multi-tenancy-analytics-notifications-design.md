# Multi-Tenancy, Analytics & Notifications Design

**Date:** 2025-01-29
**Status:** Approved
**Scope:** Multi-tenant architecture, analytics dashboard, in-app + push notifications

---

## Overview

PRIMA needs to evolve from a single-tenant application to support multiple hospitals (tenants), each with their own admins and volunteers. This design covers:

1. **Multi-Tenancy** - Hospital-centric data isolation
2. **Analytics Dashboard** - Comprehensive metrics for admins
3. **Notification System** - In-app bell + push notifications for critical events

---

## 1. Multi-Tenancy Data Model

### New `organizations` Table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "RS Cipto Mangunkusumo"
  slug TEXT NOT NULL UNIQUE,             -- "rs-cipto" for URLs
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### Modified `users` Table

Add column:
```sql
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

- **DEVELOPER**: `organization_id = NULL` (global access)
- **ADMIN/RELAWAN**: `organization_id` required (scoped to hospital)

### Modified `patients` Table

Add column:
```sql
ALTER TABLE patients ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id);
```

### Migration Strategy

1. Create "Default Hospital" organization
2. Assign all existing users and patients to it
3. DEVELOPER users get `organization_id = NULL`

---

## 2. Role & Access Control

### Role Hierarchy

| Role | Scope | Description |
|------|-------|-------------|
| DEVELOPER | Global | Superadmin, sees all organizations |
| ADMIN | Organization | Hospital admin, manages their hospital |
| RELAWAN | Organization + Assignment | Volunteer, sees only assigned patients |

### Permissions Matrix

| Action | DEVELOPER | ADMIN | RELAWAN |
|--------|-----------|-------|---------|
| View all organizations | ✅ | ❌ | ❌ |
| Create/edit organizations | ✅ | ❌ | ❌ |
| View users (own org) | ✅ | ✅ | ❌ |
| Approve/manage users (own org) | ✅ | ✅ | ❌ |
| View all patients (own org) | ✅ | ✅ | ❌ |
| View assigned patients only | ✅ | ✅ | ✅ |
| Create/edit patients (own org) | ✅ | ✅ | ✅ |
| View analytics (own org) | ✅ | ✅ | ❌ |
| View global analytics | ✅ | ❌ | ❌ |
| Manage templates | ✅ | ✅ | ❌ |
| System settings | ✅ | ❌ | ❌ |

### Implementation

- Create `src/lib/permissions.ts` with role-checking utilities
- Add `withOrgScope(query, user)` helper that auto-filters queries by `organizationId`
- Update all API routes to use org-scoped queries
- Admin panel shows org-specific data; DEVELOPER gets org switcher dropdown

### Route Changes

- `/admin/users` → ADMIN can access, scoped to their org
- `/admin/organizations` → New route, DEVELOPER only
- `/admin/analytics` → Scoped to org (DEVELOPER sees global)

---

## 3. Analytics Dashboard

### New `/admin/analytics` Page

Four main sections, all scoped by organization:

#### 3.1 Reminder Performance
- Success rate chart (sent → delivered → confirmed)
- Average response time (time from sent to confirmed)
- Failed delivery breakdown by reason
- Weekly/monthly trend lines

#### 3.2 Patient Health Metrics
- Verification funnel (pending → verified → declined/expired)
- Active vs inactive ratio over time
- Compliance rate distribution (histogram)
- New patient registrations trend

#### 3.3 Volunteer Performance
- Patients per volunteer (bar chart)
- Activity heatmap (when volunteers are most active)
- Average compliance of assigned patients
- Leaderboard (optional, gamification)

#### 3.4 WhatsApp Usage
- Messages sent/received per day
- Delivery success rate
- Peak usage hours heatmap
- Template usage breakdown

### Data Storage

- Real-time queries for current state (counts, rates)
- Pre-aggregated `analytics_daily` table for historical trends
- Nightly cron job to aggregate metrics
- All metrics scoped by `organization_id`

### API Endpoints

```
GET /api/admin/analytics/reminders
GET /api/admin/analytics/patients
GET /api/admin/analytics/volunteers
GET /api/admin/analytics/whatsapp
```

---

## 4. Notification System

### New `notifications` Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  type TEXT NOT NULL,  -- PATIENT_EVENT, REMINDER_STATUS, APPROVAL_REQUEST, SYSTEM_ALERT
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,      -- { patientId, reminderId, etc }
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_push_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;
```

### New `push_subscriptions` Table

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```

### Notification Types

| Type | Description | Push? |
|------|-------------|-------|
| PATIENT_EVENT | Patient added, verified, deactivated | No |
| REMINDER_STATUS | Reminder sent, confirmed, missed, failed | Failed only |
| APPROVAL_REQUEST | New volunteer signup needs approval | Yes |
| SYSTEM_ALERT | System errors, WhatsApp disconnected | Yes |

### In-App Notification Bell

- Header component with bell icon + unread count badge
- Dropdown shows recent notifications
- "Mark all as read" action
- Click notification → navigate to relevant page

### Push Notification Flow

1. User grants permission → save subscription to `push_subscriptions`
2. Event occurs (patient verified, reminder failed, etc.)
3. Create `notifications` record
4. If user has push subscription + event is critical → send Web Push
5. Use `web-push` npm package for server-side push

---

## 5. Implementation Phases

### Phase 1: Multi-Tenancy Foundation

1. Create `organizations` table + migration
2. Add `organizationId` to `users` and `patients`
3. Create "Default Hospital" and migrate existing data
4. Build `src/lib/permissions.ts` with org-scoping utilities
5. Update all API routes to use org-scoped queries
6. Add `/admin/organizations` page (DEVELOPER only)
7. Update `/admin/users` to work for ADMIN role (org-scoped)

### Phase 2: Analytics Dashboard

1. Create `analytics_daily` table for aggregated metrics
2. Add nightly cron job to aggregate metrics
3. Build 4 analytics API endpoints
4. Create `/admin/analytics` page with charts

### Phase 3: Notification System

1. Create `notifications` + `push_subscriptions` tables
2. Build notification service (`src/services/notification/`)
3. Add notification bell component to header
4. Integrate Web Push API for browser permissions
5. Hook notification triggers into existing event flows
6. Add push sending with `web-push` package

---

## Technical Notes

### Dependencies

- Charts: Recharts or Chart.js (already common in Next.js ecosystem)
- Push: `web-push` npm package for server-side Web Push
- No new infrastructure required (uses existing PostgreSQL + Redis)

### PWA Compatibility

Web Push notifications work on:
- Chrome, Edge, Firefox (desktop & Android)
- Safari on iOS 16.4+ (added 2023)

Since PRIMA is already on Play Store and targeting App Store, push notifications are fully supported.

### Security Considerations

- All queries must be org-scoped by default
- DEVELOPER role bypasses org-scoping
- Push subscription endpoints should be validated
- Notification metadata should not contain sensitive data

---

## Success Criteria

1. **Multi-tenancy**: ADMIN users can only see/manage their hospital's data
2. **Analytics**: Dashboard shows meaningful trends with <3s load time
3. **Notifications**: Users receive timely alerts for critical events
4. **PWA**: Push notifications work on both Android and iOS
