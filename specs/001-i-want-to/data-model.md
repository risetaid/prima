# Data Model: Remove Shell Route Group

**Date**: 2025-01-13
**Purpose**: Document authentication components and layout structure for route group migration

## Overview

This feature primarily involves restructuring routing architecture rather than creating new data entities. However, it requires careful handling of authentication components, layout hierarchy, and middleware configuration.

## Authentication Components

### 1. AuthLoading Component

**Source**: `@/components/auth/auth-loading`

**Properties**:
- `requireAuth: boolean` - Whether authentication is required
- `requireApproval: boolean` - Whether user approval is required
- Children: React.ReactNode

**Behavior**:
- Checks user authentication status via Clerk
- Validates user approval status if required
- Shows loading state during authentication checks
- Redirects unauthenticated users to sign-in
- Redirects unapproved users to pending-approval page

**Migration Strategy**: Move from shell layout to individual route layouts

### 2. DashboardErrorBoundary Component

**Source**: `@/components/ui/error-boundary`

**Purpose**: Catch and handle errors in dashboard routes

**Features**:
- Error logging and reporting
- User-friendly error messages
- Retry functionality
- Fallback UI for dashboard errors

**Migration Strategy**: Preserve in individual route layouts

## Layout Structure

### Current Shell Layout

```typescript
// src/app/(shell)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthLoading requireAuth={true} requireApproval={true}>
      <DashboardErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </DashboardErrorBoundary>
    </AuthLoading>
  )
}
```

### Target Layout Structure

#### Root Layout (Unchanged)
```typescript
// src/app/layout.tsx
- ClerkProvider configuration
- AuthProvider context
- Global styles and meta tags
- TimeFormatInitializer
```

#### Route-Specific Layouts

**Admin Layout**:
```typescript
// src/app/admin/layout.tsx
<AuthLoading requireAuth={true} requireApproval={true}>
  <DashboardErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  </DashboardErrorBoundary>
</AuthLoading>
```

**Patient Layout**:
```typescript
// src/app/pasien/layout.tsx
<AuthLoading requireAuth={true} requireApproval={true}>
  <DashboardErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  </DashboardErrorBoundary>
</AuthLoading>
```

**Reminder Layout**:
```typescript
// src/app/pengingat/layout.tsx
<AuthLoading requireAuth={true} requireApproval={true}>
  <DashboardErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  </DashboardErrorBoundary>
</AuthLoading>
```

## Middleware Configuration

### Authentication Middleware

**File**: `src/middleware.ts`

**Protected Routes**:
- `/admin/*` - Administrator routes
- `/pasien/*` - Patient management routes
- `/pengingat/*` - Reminder management routes
- `/cms/*` - Content management routes
- `/berita/*` - News/content routes
- `/kredit/*` - Credit/financial routes
- `/video-edukasi/*` - Educational video routes

**Public Routes**:
- `/sign-in/*` - Authentication pages
- `/sign-up/*` - Registration pages
- `/content/*` - Public content pages
- `/api/*` - API routes (handled separately)
- `/` - Home page

**Authentication Flow**:
1. Check if route requires authentication
2. Validate user session via Clerk
3. Redirect unauthenticated users to sign-in
4. Pass session data to layout components

### Route Mapping

**Current → Target Mapping**:

| Current Route | Target Route | Layout Required |
|---------------|--------------|-----------------|
| `(shell)/admin/*` | `admin/*` | admin/layout.tsx |
| `(shell)/pasien/*` | `pasien/*` | pasien/layout.tsx |
| `(shell)/pengingat/*` | `pengingat/*` | pengingat/layout.tsx |
| `(shell)/cms/*` | `cms/*` | cms/layout.tsx |
| `(shell)/berita/*` | `berita/*` | berita/layout.tsx |
| `(shell)/kredit/*` | `kredit/*` | kredit/layout.tsx |
| `(shell)/video-edukasi/*` | `video-edukasi/*` | video-edukasi/layout.tsx |

## File Structure Changes

### Files to be Moved

**Layout Files**:
- `src/app/(shell)/layout.tsx` → Split into individual route layouts

**Route Directories**:
- `src/app/(shell)/admin/` → `src/app/admin/`
- `src/app/(shell)/pasien/` → `src/app/pasien/`
- `src/app/(shell)/pengingat/` → `src/app/pengingat/`
- `src/app/(shell)/cms/` → `src/app/cms/`
- `src/app/(shell)/berita/` → `src/app/berita/`
- `src/app/(shell)/kredit/` → `src/app/kredit/`
- `src/app/(shell)/video-edukasi/` → `src/app/video-edukasi/`

### Files to be Created

**New Middleware**:
- `src/middleware.ts` - Authentication and route protection

**New Layout Files**:
- `src/app/admin/layout.tsx`
- `src/app/pasien/layout.tsx`
- `src/app/pengingat/layout.tsx`
- `src/app/cms/layout.tsx`
- `src/app/berita/layout.tsx`
- `src/app/kredit/layout.tsx`
- `src/app/video-edukasi/layout.tsx`

## Validation Rules

### Authentication Requirements

**All Protected Routes Must**:
- Require user authentication (Clerk session)
- Require user approval status
- Show loading states during auth checks
- Redirect appropriately for auth failures

**Layout Requirements**:
- Preserve error boundary functionality
- Maintain consistent styling wrapper
- Support nested layouts where applicable
- Handle loading and error states

### URL Preservation

**Requirements**:
- All existing URLs must continue working
- No broken links or bookmarks
- Consistent routing behavior
- Proper redirect handling

## Import Dependencies

### Required Imports for Layouts

```typescript
import { AuthLoading } from '@/components/auth/auth-loading'
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
```

### Required Imports for Middleware

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
```

## Data Flow

### Authentication Flow

1. **Request** → Middleware checks protected route status
2. **Middleware** → Validates Clerk session
3. **Success** → Route proceeds to layout component
4. **Layout** → `AuthLoading` checks approval status
5. **Success** → Page content renders
6. **Failure** → Appropriate redirect or error state

### Error Handling Flow

1. **Error Occurs** → DashboardErrorBoundary catches
2. **Logging** → Error logged to monitoring system
3. **UI Update** -> User-friendly error message displayed
4. **Recovery** -> User can retry or navigate away

This data model provides the foundation for implementing the route group migration while preserving all authentication, authorization, and error handling functionality.