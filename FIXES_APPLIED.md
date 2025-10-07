# API Response Unwrapping Fixes

## Root Cause
The `createApiHandler` wrapper returns responses in this format:
```json
{
  "success": true,
  "data": { ... actual data ... },
  "message": "...",
  "timestamp": "...",
  "requestId": "..."
}
```

But client code was expecting the data directly.

## Files Fixed

### ✅ Auth Context
- `/src/lib/auth-context.tsx` - Line 126: Extract `responseData.data`

### ✅ Patient Pages
- `/src/app/(shell)/pasien/page.tsx` - Lines 51-63: Unwrap API responses
- `/src/app/(shell)/pengingat/page.tsx` - Lines 52-65: Unwrap API responses

### ✅ UI Fixes
- `/src/app/(shell)/pasien/page.tsx` - Added optional chaining for `filteredPatients`

## Pages Already Correct
- `/src/app/(shell)/berita/page.tsx` - Already checks `data.success && data.data`
- `/src/app/(shell)/video-edukasi/page.tsx` - Already checks `data.success && data.data`

## Remaining Pages to Check
If you still have issues with `/cms` or `/admin`, check these files:
- `/src/app/(shell)/cms/page.tsx`
- `/src/app/(shell)/admin/page.tsx`

## Pattern to Use
```typescript
const response = await fetch('/api/endpoint')
const result = await response.json()
const data = result.data || result  // Unwrap if wrapped
// Use data...
```

## Helper Created
Created `/src/lib/api-client.ts` with `unwrapApiResponse()` helper for future use.
