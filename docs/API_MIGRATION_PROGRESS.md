# API Routes Migration to createApiHandler Pattern

**Date Started:** 2025-10-06  
**Status:** 🚧 IN PROGRESS

---

## 🎯 Objective

Migrate all API routes from legacy manual authentication pattern to the standardized `createApiHandler` pattern to reduce boilerplate code and improve consistency.

---

## 📊 Progress Overview

### Current Status

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total API Routes** | ~45 routes | 100% |
| **Using createApiHandler** | 6 routes | 13% |
| **Using Legacy Pattern** | ~39 routes | 87% |
| **Lines Reduced** | 67 lines | - |

### Migration Completed

✅ **2 Routes Migrated** (Latest batch)

---

## ✅ Migrated Routes

### Batch 1: Patient API Routes (2025-10-06)

#### 1. `/api/patients/[id]/route.ts`
- **Methods:** GET, PUT, DELETE
- **Before:** 156 lines
- **After:** 110 lines  
- **Reduction:** 46 lines (29% less code)

**Improvements:**
- ✅ Automatic auth validation with `auth: "required"`
- ✅ Zod schema validation for params and body
- ✅ Type-safe request/response handling
- ✅ Built-in error handling
- ✅ Removed manual `getAuthUser()` calls (3x)
- ✅ Removed manual param validation (3x)
- ✅ Removed try-catch boilerplate (3x)

#### 2. `/api/patients/[id]/version/route.ts`
- **Methods:** GET
- **Before:** 62 lines
- **After:** 41 lines
- **Reduction:** 21 lines (34% less code)

**Improvements:**
- ✅ Clean declarative route definition
- ✅ Automatic auth and param validation
- ✅ Simpler error handling with throw
- ✅ Type-safe patient version response

---

## 🔄 Routes Already Using createApiHandler

### Previously Migrated

1. ✅ `/api/patients/route.ts` - GET, POST
2. ✅ `/api/reminders/scheduled/[id]/route.ts` - GET, PATCH, DELETE

---

## ⏳ Routes Pending Migration

### High Priority (High Traffic)

1. ⏳ `/api/patients/[id]/reminders/route.ts` - GET, POST, PUT
2. ⏳ `/api/cms/articles/route.ts` - GET, POST
3. ⏳ `/api/cms/videos/route.ts` - GET, POST
4. ⏳ `/api/dashboard/overview/route.ts` - GET
5. ⏳ `/api/user/session/route.ts` - GET, POST

### Medium Priority

6. ⏳ `/api/patients/[id]/reminders/stats/route.ts`
7. ⏳ `/api/patients/[id]/manual-verification/route.ts`
8. ⏳ `/api/patients/[id]/send-verification/route.ts`
9. ⏳ `/api/patients/[id]/verification-history/route.ts`
10. ⏳ `/api/admin/users/route.ts`
11. ⏳ `/api/admin/users/[userId]/route.ts`
12. ⏳ `/api/admin/templates/route.ts`
13. ⏳ `/api/admin/templates/[id]/route.ts`

### Lower Priority (Less Frequent)

14. ⏳ `/api/patients/[id]/deactivate/route.ts`
15. ⏳ `/api/patients/[id]/reactivate/route.ts`
16. ⏳ `/api/patients/with-compliance/route.ts`
17. ⏳ `/api/user/profile/route.ts`
18. ⏳ `/api/user/status/route.ts`
19. ⏳ `/api/templates/route.ts`

### Special Cases (Complex Routes)

20. ⏳ `/api/reminders/instant-send-all/route.ts` - Complex business logic
21. ⏳ `/api/cms/content/route.ts` - Large file, multiple endpoints
22. ⏳ `/api/upload/route.ts` - File upload handling
23. ⏳ `/api/webhooks/*` - External integrations

### System Routes (Keep As Is)

- `/api/health/route.ts` - Simple health check
- `/api/auth/*` - Auth-specific routes
- `/api/cron/*` - Scheduled tasks with special auth

---

## 📈 Benefits Achieved

### Code Quality
- ✅ **67 lines removed** across 2 files
- ✅ **29-34% code reduction** per file
- ✅ Eliminated repetitive boilerplate
- ✅ Improved code readability

### Developer Experience
- ✅ Declarative, config-based route definition
- ✅ Automatic TypeScript type inference
- ✅ Consistent error handling patterns
- ✅ Less manual testing needed

### Reliability
- ✅ Standardized authentication checks
- ✅ Automatic input validation with Zod
- ✅ Structured error responses
- ✅ Built-in request tracking and logging

---

## 🔧 Migration Pattern

### Before (Legacy Pattern)
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!id) {
      return createErrorResponse("Invalid ID", 400);
    }

    const data = await getData(id);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "fetching data");
  }
}
```

**Lines:** ~20-30 per endpoint  
**Boilerplate:** Auth check, param validation, try-catch, manual responses

### After (createApiHandler Pattern)
```typescript
const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = createApiHandler(
  {
    auth: "required",
    params: paramsSchema,
  },
  async (_, context) => {
    const { id } = context.params!;
    const data = await getData(id);
    return data;
  }
);
```

**Lines:** ~10-15 per endpoint  
**Boilerplate:** None - all handled by wrapper

---

## 📝 Migration Checklist

For each route to migrate:

- [ ] Identify auth requirements (`required` vs `optional`)
- [ ] Define Zod schemas for params, body, query
- [ ] Replace manual auth checks with `auth` config
- [ ] Replace manual validation with schema config
- [ ] Remove try-catch blocks (handled automatically)
- [ ] Update to use `context.user`, `context.params`
- [ ] Change `return NextResponse.json()` to `return data`
- [ ] Test TypeScript compilation
- [ ] Test lint checks
- [ ] Verify route functionality

---

## 🎯 Success Criteria

### Phase 1 (Current)
- [x] Migrate 2+ routes as proof of concept
- [x] Verify zero breaking changes
- [x] Achieve 25%+ code reduction per file

### Phase 2 (Next)
- [ ] Migrate 10+ high-traffic routes
- [ ] Achieve 200+ lines reduction
- [ ] Update migration guide with learnings

### Phase 3 (Future)
- [ ] Migrate all remaining routes (target: 90%+)
- [ ] Achieve 500+ lines total reduction
- [ ] Create automated migration tooling

---

## 🚀 Next Steps

1. **Immediate (This Session)**
   - Continue migrating high-priority routes
   - Target: 5-10 more routes
   - Focus on patient and CMS endpoints

2. **Short Term (Next Sprint)**
   - Migrate remaining patient-related routes
   - Migrate admin and user routes
   - Document edge cases and solutions

3. **Medium Term (Future)**
   - Migrate complex routes (webhooks, uploads)
   - Create migration automation scripts
   - Update team guidelines

---

## 📚 Resources

- **Pattern Guide:** `/docs/API_PATTERNS.md`
- **Helper Functions:** `/src/lib/api-helpers.ts`
- **Example Routes:** 
  - `/src/app/api/patients/[id]/route.ts`
  - `/src/app/api/patients/[id]/version/route.ts`
  - `/src/app/api/patients/route.ts`

---

**Last Updated:** 2025-10-06  
**Maintained By:** Development Team
