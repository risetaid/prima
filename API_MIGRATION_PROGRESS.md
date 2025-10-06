# API Migration Progress Tracker

> **Created:** 2025-10-06
> **Based on:** API_PATTERNS.md guidelines
> **Target:** Migrate all API routes to `createApiHandler` pattern

---

## 📊 Migration Status

### ✅ COMPLETED MIGRATIONS (3 routes)

1. **`/api/user/profile`** ✅
   - Migrated to `createApiHandler` with `auth: "optional"`
   - Handles Clerk user auto-sync
   - Preserves special unapproved user response

2. **`/api/reminders/instant-send-all`** ✅
   - Migrated to `createApiHandler` with `auth: "required"`
   - Rate limiting preserved (5 requests/hour)
   - Error handling updated to throw errors for createApiHandler

3. **`/api/patients/[id]/reminders`** ✅
   - All methods migrated (GET, POST, DELETE)
   - Zod schemas added for params, query, and body validation
   - Patient access control preserved
   - Response format standardized

### 🔄 PARTIALLY MIGRATED (0 routes)

None currently.

### ❌ NOT YET MIGRATED (35 routes)

**Admin APIs (7):**
- `/api/admin/developer-contact`
- `/api/admin/sync-clerk`
- `/api/admin/templates`
- `/api/admin/templates/seed`
- `/api/admin/templates/[id]`
- `/api/admin/users/[userId]`
- `/api/admin/verification-analytics`

**Auth APIs (3):**
- `/api/auth/clear-cache`
- `/api/auth/debug`
- `/api/auth/update-last-login`

**CMS APIs (5):**
- `/api/cms/articles`
- `/api/cms/articles/[id]`
- `/api/cms/content`
- `/api/cms/videos`
- `/api/cms/videos/[id]`

**Patient APIs (6):**
- `/api/patients/with-compliance`
- `/api/patients/[id]/deactivate`
- `/api/patients/[id]/manual-verification`
- `/api/patients/[id]/reactivate`
- `/api/patients/[id]/reminders/stats`
- `/api/patients/[id]/reminders/[reminderId]/confirm`
- `/api/patients/[id]/send-verification`
- `/api/patients/[id]/verification-history`

**Other APIs (14):**
- `/api/cron/cleanup-conversations`
- `/api/dashboard/overview`
- `/api/debug/webhook`
- `/api/health`
- `/api/reminders/scheduled/[id]`
- `/api/templates`
- `/api/upload`
- `/api/user/session`
- `/api/user/status`
- `/api/webhooks/clerk`
- `/api/webhooks/fonnte/incoming`
- `/api/webhooks/fonnte/message-status`
- `/api/youtube/fetch`

---

## 🛠️ Migration Tools Created

### 1. **API Schemas Library** (`/src/lib/api-schemas.ts`)
- Centralized Zod validation schemas
- Common patterns (UUID, pagination, dates, booleans)
- Entity-specific schemas (User, Patient, Reminder, Content)
- Composed schemas for typical use cases

### 2. **Migration Pattern Examples**
See migrated routes for reference implementations:
- Profile API: Optional auth with custom error handling
- Instant Send: Required auth with rate limiting
- Patient Reminders: Full CRUD with access control

---

## 📋 Migration Checklist

### For Each API Route:

#### ✅ Pre-Migration
- [ ] Identify current pattern (legacy vs createApiHandler)
- [ ] Note any special handling (rate limiting, custom responses)
- [ ] List required validation schemas

#### ✅ Migration Steps
- [ ] Update imports: `createApiHandler`, `z`, validation schemas
- [ ] Create/use appropriate Zod schemas
- [ ] Replace function signature with `createApiHandler`
- [ ] Update auth pattern (`"required"` vs `"optional"`)
- [ ] Replace manual error handling with throws
- [ ] Update return statements to return data directly
- [ ] Preserve any special headers or custom responses

#### ✅ Post-Migration
- [ ] Test all HTTP methods
- [ ] Verify validation works correctly
- [ ] Check error responses are standardized
- [ ] Ensure auth/authorization still works

---

## 🔍 Key Learnings from Migrations

### 1. **Special Response Handling**
Some APIs need custom NextResponse.json returns:
- Unapproved user responses (needs `needsApproval: true`)
- Rate limit headers (Retry-After, X-RateLimit-*)

### 2. **Access Control Integration**
PatientAccessControl integrates seamlessly:
```typescript
await PatientAccessControl.requireAccess(
  user!.id,
  user!.role,
  patientId,
  "action description"
);
```

### 3. **Complex Query Parameters**
Use Zod transforms for string-to-boolean conversions:
```typescript
includeDeleted: z.enum(["true", "false"]).transform(val => val === "true")
```

### 4. **Multi-Method Routes**
Each HTTP method needs its own createApiHandler export:
```typescript
export const GET = createApiHandler(...);
export const POST = createApiHandler(...);
export const DELETE = createApiHandler(...);
```

---

## 🎯 Next Priority Routes

Based on usage and criticality:

### High Priority
1. **`/api/admin/users`** - Core admin functionality
2. **`/api/patients`** - Already uses createApiHandler, verify others
3. **`/api/cms/articles`** - Content management
4. **`/api/templates`** - Template management

### Medium Priority
1. **Auth APIs** - Lower usage, simple patterns
2. **Dashboard APIs** - Read-only, simple validation
3. **Patient action APIs** - Similar patterns to reminders

### Low Priority
1. **Webhook APIs** - External integrations, may need special handling
2. **Debug APIs** - Development tools only
3. **Cron APIs** - System internal use

---

## 📈 Impact Metrics

### Code Reduction
- **Profile API**: ~115 lines → ~115 lines (similar complexity, better structure)
- **Instant Send API**: ~369 lines → ~342 lines (7.3% reduction)
- **Patient Reminders API**: ~1180 lines → ~1160 lines (1.7% reduction)

### Benefits Achieved
- ✅ Standardized error responses
- ✅ Automatic request ID tracking
- ✅ Built-in validation with clear error messages
- ✅ Consistent authentication patterns
- ✅ Type safety with Zod schemas

### Expected Total Impact
- **API Routes**: 38 total → 38 migrated
- **Estimated Code Reduction**: 10-15%
- **Consistency**: 100% standardized patterns
- **Type Safety**: 100% validation coverage

---

## 🔧 Implementation Notes

### 1. **Import Strategy**
```typescript
// Old pattern
import { getCurrentUser } from "@/lib/auth-utils";
import { createErrorResponse } from "@/lib/api-helpers";

// New pattern
import { createApiHandler } from "@/lib/api-helpers";
import { schemas } from "@/lib/api-schemas";
```

### 2. **Validation Reuse**
```typescript
// Use centralized schemas
const createPatientSchema = schemas.createPatient;
const patientIdSchema = schemas.patientIdParam;
```

### 3. **Error Handling Pattern**
```typescript
// Old: Manual error responses
if (!user) {
  return createErrorResponse("Unauthorized", 401);
}

// New: Throw errors
if (!user) {
  throw new Error("Unauthorized");
}
```

---

## 🚀 Migration Commands

### Check Migration Status
```bash
# Find routes still using legacy patterns
find src/app/api -name "route.ts" -exec grep -l "getCurrentUser\|NextResponse\|createErrorResponse" {} \;

# Count migrated vs total
total=$(find src/app/api -name "route.ts" | wc -l)
migrated=$(find src/app/api -name "route.ts" -exec grep -l "createApiHandler" {} \; | wc -l)
echo "Progress: $migrated/$total routes migrated"
```

### Test Migrated APIs
```bash
# Run type checking
bunx tsc --noEmit

# Run linter
bun run lint

# Test specific endpoints
curl -X GET http://localhost:3000/api/user/profile
curl -X POST http://localhost:3000/api/reminders/instant-send-all
```

---

## 📚 Related Documentation

- `/docs/API_PATTERNS.md` - Complete API patterns guide
- `/src/lib/api-helpers.ts` - createApiHandler implementation
- `/src/lib/api-schemas.ts` - Validation schemas library
- `/src/services/patient/patient-access-control.ts` - Access control patterns

---

**Maintained by:** Development Team
**Last Updated:** 2025-10-06
**Migration Progress:** 3/38 routes (7.9%)