# API Contracts (main)

Scan mode: quick (path- and filename-based inventory).

## Endpoint Inventory

### System and Health

- `/api/health`
- `/api/health/ready`
- `/api/cron`
- `/api/cron/cleanup-conversations`

### Authentication and User

- `/api/auth/debug`
- `/api/auth/update-last-login`
- `/api/auth/clear-cache`
- `/api/user/status`
- `/api/user/session`
- `/api/user/profile`

### Patient and Reminder Operations

- `/api/patients`
- `/api/patients/with-compliance`
- `/api/patients/[id]`
- `/api/patients/[id]/version`
- `/api/patients/[id]/reactivate`
- `/api/patients/[id]/deactivate`
- `/api/patients/[id]/reminders`
- `/api/patients/[id]/reminders/stats`
- `/api/patients/[id]/reminders/[reminderId]/confirm`
- `/api/patients/[id]/send-verification`
- `/api/patients/[id]/manual-verification`
- `/api/patients/[id]/verification-history`
- `/api/reminders/instant-send-all`
- `/api/reminders/scheduled/[id]`

### CMS and Content

- `/api/cms/articles`
- `/api/cms/articles/[id]`
- `/api/cms/videos`
- `/api/cms/videos/[id]`
- `/api/cms/content`
- `/api/templates`
- `/api/youtube/fetch`
- `/api/upload`

### Admin

- `/api/admin/users`
- `/api/admin/users/[userId]`
- `/api/admin/templates`
- `/api/admin/templates/[id]`
- `/api/admin/templates/seed`
- `/api/admin/developer-contact`
- `/api/admin/sync-clerk`
- `/api/admin/verification-analytics`

### Webhooks and Debug

- `/api/webhooks/clerk`
- `/api/webhooks/gowa`
- `/api/debug/webhook`
- `/api/debug/clear-cache`
- `/api/test/reminder-flow`
- `/api/dashboard/overview`

## Notes

- Routes are implemented as Next.js App Router handlers in `src/app/api/**/route.ts`.
- HTTP methods and request/response schemas should be finalized with deep or exhaustive mode if required.
- Total discovered route files: 46.
