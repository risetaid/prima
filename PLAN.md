# Comprehensive Plan to Fix TypeScript and ESLint Issues

## Overview
This document outlines a comprehensive plan to fix all TypeScript compilation errors and ESLint warnings/errors in the PRIMA codebase without changing any API inputs/outputs.

## Issues Summary

### TypeScript Errors (3 total)
1. **File: `src/app/api/patients/[id]/reminders/route.ts`**
   - Lines 208 & 279: `inArray` function calls with readonly arrays
   - Error: `readonly` arrays cannot be assigned to mutable array types

2. **File: `src/app/api/reminders/scheduled/[id]/route.ts`**
   - Lines 37-39: `body` parameter typed as `unknown`
   - Error: Property access on unknown type needs proper typing

### ESLint Errors (13 total)
1. **File: `src/app/(shell)/cms/page.tsx`**
   - Lines 187, 195, 196, 202, 210, 211, 216, 217, 223, 224, 228, 229, 233, 234, 421: Multiple `any` type usage
   - Lines 195, 196: Unused variables (`articles`, `videos`)

### ESLint Warnings (2 total)
1. **File: `src/app/(shell)/pengingat/pasien/[id]/page.tsx`**
   - Line 43: Unused variable `completedReminders`

2. **File: `src/app/(shell)/pengingat/pasien/[id]/semua/page.tsx`**
   - Line 56: `any` type usage

## Detailed Fix Plan

### Phase 1: TypeScript Errors

#### 1.1 Fix `inArray` readonly array issues in `patients/[id]/reminders/route.ts`

**Problem**: Lines 202-203 and 273 use `as const` which creates readonly arrays, but `inArray` expects mutable arrays.

**Current Code:**
```typescript
const sentStatuses = ['SENT', 'DELIVERED'] as const;
// ...
inArray(reminders.status, sentStatuses)

const scheduledStatuses = ['PENDING', 'FAILED'] as const;
// ...
inArray(reminders.status, scheduledStatuses)
```

**Solution**: Change to mutable arrays with proper typing
```typescript
const sentStatuses: Array<"SENT" | "DELIVERED"> = ['SENT', 'DELIVERED'];
// ...
inArray(reminders.status, sentStatuses)

const scheduledStatuses: Array<"PENDING" | "FAILED"> = ['PENDING', 'FAILED'];
// ...
inArray(reminders.status, scheduledStatuses)
```

#### 1.2 Fix `body` type issues in `reminders/scheduled/[id]/route.ts`

**Problem**: The `createApiHandler` function provides `body` as `unknown` type

**Current Code:**
```typescript
export const PUT = createApiHandler(
  { auth: "required", params: paramsSchema, body: updateBodySchema },
  async (body, { user, params }) => {
    const updated = await reminderService.updateReminder(
      reminderId,
      {
        reminderTime: body.reminderTime,        // Error: body is unknown
        customMessage: body.customMessage,      // Error: body is unknown
        attachedContent: body.attachedContent,  // Error: body is unknown
      },
      user!.id,
      user!.role
    );
  }
);
```

**Solution**: Add type assertion based on the schema
```typescript
export const PUT = createApiHandler(
  { auth: "required", params: paramsSchema, body: updateBodySchema },
  async (body, { user, params }) => {
    const typedBody = body as z.infer<typeof updateBodySchema>;
    const updated = await reminderService.updateReminder(
      reminderId,
      {
        reminderTime: typedBody.reminderTime,
        customMessage: typedBody.customMessage,
        attachedContent: typedBody.attachedContent,
      },
      user!.id,
      user!.role
    );
  }
);
```

### Phase 2: ESLint Errors

#### 2.1 Fix `any` types in `cms/page.tsx`

**Problem**: Multiple uses of `any` type for API response processing

**Solution**: Define proper interfaces for the data structures

Add these interfaces at the top of the file:
```typescript
interface ContentItem {
  id: string;
  title: string;
  type: 'article' | 'video';
  status: 'published' | 'draft' | 'PUBLISHED' | 'DRAFT';
}

interface StatisticsResponse {
  articles: {
    total: number;
    published: number;
    draft: number;
  };
  videos: {
    total: number;
    published: number;
    draft: number;
  };
}

interface ApiResponseData {
  success: boolean;
  data: ContentItem[] | { statistics: StatisticsResponse } | { data: ContentItem[] };
}
```

Then replace `any` types with proper interfaces:
```typescript
// Line 187
sampleItems: data.data.slice(0, 2).map((item: ContentItem) => ({

// Line 195-196 (remove unused variables or use them)
const articles = data.data.filter((item: ContentItem) => item.type === 'article');
const videos = data.data.filter((item: ContentItem) => item.type === 'video');
// Use these variables or remove them entirely

// Line 202
sampleItems: contentArray.slice(0, 2).map((item: ContentItem) => ({

// Line 210-211
const articles = contentArray.filter((item: ContentItem) => item.type === 'article');
const videos = contentArray.filter((item: ContentItem) => item.type === 'video');

// Line 216-217, 223-224, 228-229, 233-234
articleStatuses: articles.map((a: ContentItem) => a.status),
videoStatuses: videos.map((v: ContentItem) => v.status),

// Line 421
logger.info('🎯 Rendering CMSStatsCards with statistics:', statistics as StatisticsResponse);
```

#### 2.2 Remove unused variables in `cms/page.tsx`

**Problem**: Lines 195-196 have unused `articles` and `videos` variables

**Solution**: Either use the variables or remove them entirely

Since they're calculated but not used, and there's similar logic below that is used, we can remove these specific lines:
```typescript
// Remove lines 195-196:
// const articles = data.data.filter((item: any) => item.type === 'article');
// const videos = data.data.filter((item: any) => item.type === 'video');
```

### Phase 3: ESLint Warnings

#### 3.1 Remove unused variable in `pengingat/pasien/[id]/page.tsx`

**Problem**: Line 43 has unused `completedReminders` state

**Current Code:**
```typescript
const [completedReminders, setCompletedReminders] = useState<CompletedReminder[]>([]);
```

**Solution**: If this state is truly unused, remove it entirely:
```typescript
// Remove the entire line 43
```

#### 3.2 Fix `any` type in `pengingat/pasien/[id]/semua/page.tsx`

**Problem**: Line 56 uses `any` type for reminder mapping

**Current Code:**
```typescript
const allReminders = remindersData.map((reminder: any) => {
```

**Solution**: Define a proper interface for the reminder data:
```typescript
interface ReminderData {
  id: string;
  manuallyConfirmed?: boolean;
  confirmationStatus?: string;
  status?: string;
  // Add other properties as needed
}

const allReminders = remindersData.map((reminder: ReminderData) => {
```

## Implementation Strategy

### Step-by-Step Execution:

1. **Fix TypeScript errors first** (highest priority)
   - Modify `patients/[id]/reminders/route.ts` lines 202-203, 273
   - Modify `reminders/scheduled/[id]/route.ts` lines 37-39
   - Run `bunx tsc --noEmit` to verify fixes

2. **Fix ESLint errors** (medium priority)
   - Add interfaces to `cms/page.tsx`
   - Replace all `any` types with proper interfaces
   - Remove unused variables
   - Run `bun run lint` to verify fixes

3. **Fix ESLint warnings** (low priority)
   - Remove unused state variable from `pengingat/pasien/[id]/page.tsx`
   - Add proper typing to `pengingat/pasien/[id]/semua/page.tsx`
   - Run final verification

### Verification Steps:

After each phase, run:
```bash
bunx tsc --noEmit   # Verify TypeScript compilation
bun run lint        # Verify ESLint compliance
```

### Risk Assessment:

**Low Risk Changes:**
- Type annotations and interface additions
- Removal of unused variables
- Array type modifications

**No API Changes:**
- All fixes are purely for type safety and code quality
- No API request/response structures will change
- No business logic modifications
- No database schema changes

## Expected Outcome

After implementing all fixes:
1. ✅ `bunx tsc --noEmit` will pass without errors
2. ✅ `bun run lint` will pass without errors or warnings
3. ✅ Code will have proper TypeScript typing
4. ✅ All `any` types will be replaced with proper interfaces
5. ✅ All unused variables will be removed
6. ✅ API behavior will remain unchanged

## Files to be Modified

1. `src/app/api/patients/[id]/reminders/route.ts` - TypeScript fixes
2. `src/app/api/reminders/scheduled/[id]/route.ts` - TypeScript fixes
3. `src/app/(shell)/cms/page.tsx` - ESLint error fixes
4. `src/app/(shell)/pengingat/pasien/[id]/page.tsx` - ESLint warning fix
5. `src/app/(shell)/pengingat/pasien/[id]/semua/page.tsx` - ESLint warning fix

## Timeline

- **Phase 1 (TypeScript errors)**: 15 minutes
- **Phase 2 (ESLint errors)**: 30 minutes
- **Phase 3 (ESLint warnings)**: 15 minutes
- **Total estimated time**: 60 minutes

This comprehensive plan ensures all type safety and code quality issues are resolved while maintaining complete API compatibility and business logic integrity.