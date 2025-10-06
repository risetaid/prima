# API Patterns & Best Practices - PRIMA System

> **Last Updated:** 2025-10-06  
> **Status:** Active Guidelines

---

## 📋 Overview

This document outlines the recommended patterns for building API routes in the PRIMA system, with focus on authentication, validation, and error handling.

---

## 🔐 Authentication Patterns

### ✅ Recommended: Use `createApiHandler`

The **preferred way** to create authenticated API routes is using the `createApiHandler` wrapper from `@/lib/api-helpers.ts`:

```typescript
import { createApiHandler } from "@/lib/api-helpers";
import { z } from "zod";

// Define your schemas
const bodySchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string()
});

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const POST = createApiHandler(
  {
    auth: "required", // or "optional"
    body: bodySchema,
    params: paramsSchema,
  },
  async (body, context) => {
    // context.user is guaranteed to exist when auth: "required"
    // context.params is validated against paramsSchema
    // body is validated against bodySchema
    
    const { user, params } = context;
    
    // Your business logic here
    const result = await doSomething(body, user.id);
    
    return result; // Automatically wrapped in success response
  }
);
```

**Benefits:**
- ✅ Automatic authentication check
- ✅ Automatic validation with Zod
- ✅ Standardized error responses
- ✅ Built-in logging
- ✅ Request ID tracking
- ✅ Optional caching support

### ⚠️ Legacy Pattern (Not Recommended)

Many existing routes still use the manual auth pattern:

```typescript
import { getAuthUser } from "@/lib/auth-utils";
import { createErrorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return createErrorResponse("Unauthorized", 401, undefined, "AUTHENTICATION_ERROR");
  }
  
  // Rest of logic...
}
```

**Why not recommended:**
- ❌ Repetitive boilerplate (30+ routes have this pattern)
- ❌ Inconsistent error messages
- ❌ No automatic validation
- ❌ Manual logging required

**Migration Status:** 
- Total API routes: ~40+
- Using `createApiHandler`: ~10
- Using legacy pattern: ~30
- **Target:** Migrate to `createApiHandler` during refactoring

---

## 🔒 Access Control Patterns

### Patient Access Control

For routes that access patient data, use `PatientAccessControl` from `@/services/patient/patient-access-control.ts`:

```typescript
import { PatientAccessControl } from "@/services/patient/patient-access-control";

export const GET = createApiHandler(
  { auth: "required", params: paramsSchema },
  async (body, context) => {
    const { id } = context.params!;
    
    // Check if user has access to this patient
    await PatientAccessControl.requireAccess(
      context.user!.id,
      context.user!.role,
      id,
      "view this patient's data"
    );
    
    // Proceed with business logic
    const patient = await getPatient(id);
    return patient;
  }
);
```

**Available Methods:**
- `canAccessPatient(userId, userRole, patientId)` - Returns boolean
- `requireAccess(userId, userRole, patientId, action)` - Throws error if denied
- `getAssignedPatients(userId, userRole)` - Returns list of accessible patients

---

## ✅ Validation Patterns

### Using Zod Schemas

Always define and reuse Zod schemas for validation:

```typescript
import { z } from "zod";

// Define reusable schemas
const createPatientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().regex(/^62\d{9,12}$/, "Invalid Indonesian phone"),
  address: z.string().optional(),
  birthDate: z.string().optional(),
});

// Use in handler
export const POST = createApiHandler(
  {
    auth: "required",
    body: createPatientSchema,
  },
  async (body, context) => {
    // body is already validated and typed!
    const patient = await createPatient(body);
    return patient;
  }
);
```

---

## 📊 Response Patterns

### Success Responses

```typescript
// Using createApiHandler - automatic wrapping
return { id: "123", name: "John" };

// Manual (if not using createApiHandler)
import { apiSuccess } from "@/lib/api-helpers";
return apiSuccess({ id: "123", name: "John" });
```

**Response format:**
```json
{
  "success": true,
  "data": { "id": "123", "name": "John" },
  "message": "Request completed successfully",
  "timestamp": "2025-10-06T10:00:00.000Z",
  "requestId": "abc12345"
}
```

### Error Responses

```typescript
// Throw error - automatically handled
throw new Error("Patient not found");

// Manual error response
import { apiError } from "@/lib/api-helpers";
return apiError("Patient not found", {
  status: 404,
  code: "NOT_FOUND",
});
```

**Response format:**
```json
{
  "success": false,
  "error": "Patient not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-10-06T10:00:00.000Z",
  "requestId": "abc12345"
}
```

---

## 🎯 Role-Based Access

### Page-Level Protection

Use auth utilities for server components:

```typescript
import { requireAdmin, requireApprovedUser } from "@/lib/auth-utils";

// Admin-only page
export default async function AdminPage() {
  const user = await requireAdmin(); // Auto-redirects if not admin
  
  return <div>Admin content for {user.email}</div>;
}

// Approved user page
export default async function DashboardPage() {
  const user = await requireApprovedUser(); // Auto-redirects if not approved
  
  return <div>Dashboard for {user.firstName}</div>;
}
```

**Available Functions:**
- `requireAuth()` - Any authenticated user
- `requireApprovedUser()` - Approved users only
- `requireAdmin()` - Admin or Developer role
- `requireDeveloper()` - Developer role only

**Removed Functions (use alternatives):**
- ~~`requireAdminOrDeveloper()`~~ - Use `requireAdmin()` instead (identical)
- ~~`requireDeveloperOnly()`~~ - Use `requireDeveloper()` instead (identical)

---

## 📝 Best Practices

### DO ✅

1. **Use `createApiHandler` for new API routes**
   - Consistent auth, validation, and error handling
   - Less boilerplate code

2. **Use Zod for all input validation**
   - Type-safe validation
   - Clear error messages

3. **Use `PatientAccessControl` for patient data access**
   - Centralized access control logic
   - Consistent permission checking

4. **Use appropriate error codes**
   - `AUTHENTICATION_ERROR` (401)
   - `AUTHORIZATION_ERROR` (403)
   - `VALIDATION_ERROR` (400)
   - `NOT_FOUND` (404)

5. **Log important operations**
   - Use structured logging with context
   - Include userId, operation, requestId

### DON'T ❌

1. **Don't manually implement auth checks repeatedly**
   - Use `createApiHandler` instead

2. **Don't use generic error messages**
   - Be specific: "Patient not found" not "Error occurred"

3. **Don't skip validation**
   - Always validate input with Zod schemas

4. **Don't bypass access control**
   - Always check patient access permissions

5. **Don't use deprecated auth functions**
   - Use `requireAdmin()` not `requireAdminOrDeveloper()`

---

## 🔄 Migration Guide

### Migrating from Legacy to createApiHandler

**Before:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, "fetching data");
  }
}
```

**After:**
```typescript
const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = createApiHandler(
  {
    auth: "required",
    params: paramsSchema,
  },
  async (body, context) => {
    const { id } = context.params!;
    const data = await getData(id);
    return data;
  }
);
```

**Reduction:** ~15 lines → ~8 lines (47% less code)

---

## 📈 Impact Metrics

### Current Status (Phase 2)
- Auth functions reduced: 2 removed (requireAdminOrDeveloper, requireDeveloperOnly)
- Code duplication: ~30 lines removed
- Available helper: `createApiHandler` (used in ~25% of routes)

### Future Goals
- Migrate 100% of routes to use `createApiHandler`
- Eliminate all manual auth checking patterns
- Achieve 100% input validation coverage

---

## 🔗 Related Documentation

- `/src/lib/api-helpers.ts` - API helper functions
- `/src/lib/auth-utils.ts` - Authentication utilities
- `/src/services/patient/patient-access-control.ts` - Patient access control
- `/PLAN.md` - Overall code deduplication plan

---

**Maintained by:** Development Team  
**Questions?** Check existing API routes for examples or ask in team chat.
