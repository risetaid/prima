# Quickstart Guide: Remove Shell Route Group

**Purpose**: Quick reference for implementing the route group migration
**Date**: 2025-01-13

## Overview

This guide provides step-by-step instructions for migrating authenticated pages from `(shell)` route group to direct routing structure while preserving all functionality.

## Prerequisites

- Node.js 18+ and Bun installed
- Understanding of Next.js 15 routing and layouts
- Access to Clerk authentication configuration
- Development environment set up

## Migration Steps

### Step 1: Create Authentication Middleware

Create `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Protected routes that require authentication
const protectedRoutes = [
  '/admin',
  '/pasien',
  '/pengingat',
  '/cms',
  '/berita',
  '/kredit',
  '/video-edukasi'
]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check if path requires authentication
  const isProtectedRoute = protectedRoutes.some(route =>
    path.startsWith(route)
  )

  // Skip middleware for static assets and API routes
  if (path.startsWith('/api') || path.startsWith('/_next') ||
      path.startsWith('/sign-in') || path.startsWith('/sign-up') ||
      path.includes('.')) {
    return NextResponse.next()
  }

  // Check authentication status
  const { userId } = auth()

  if (isProtectedRoute && !userId) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', path)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
}
```

### Step 2: Create Individual Layout Files

**Admin Layout** (`src/app/admin/layout.tsx`):

```typescript
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { AuthLoading } from '@/components/auth/auth-loading'

export default function AdminLayout({
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

**Patient Layout** (`src/app/pasien/layout.tsx`):

```typescript
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { AuthLoading } from '@/components/auth/auth-loading'

export default function PasienLayout({
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

**Repeat for other routes**: Create similar layout files for:
- `src/app/pengingat/layout.tsx`
- `src/app/cms/layout.tsx`
- `src/app/berita/layout.tsx`
- `src/app/kredit/layout.tsx`
- `src/app/video-edukasi/layout.tsx`

### Step 3: Move Route Directories

For each directory in `(shell)`, move it to the root level:

```bash
# Move admin routes
mv src/app/\(shell\)/admin/* src/app/admin/

# Move patient routes
mv src/app/\(shell\)/pasien/* src/app/pasien/

# Move reminder routes
mv src/app/\(shell\)/pengingat/* src/app/pengingat/

# Move CMS routes
mv src/app/\(shell\)/cms/* src/app/cms/

# Move other routes
mv src/app/\(shell\)/berita/* src/app/berita/
mv src/app/\(shell\)/kredit/* src/app/kredit/
mv src/app/\(shell\)/video-edukasi/* src/app/video-edukasi/
```

### Step 4: Update Import Statements

Check and update any import statements that reference the old shell structure:

**Before**:
```typescript
import { SomeComponent } from '../../../(shell)/admin/components/some-component'
```

**After**:
```typescript
import { SomeComponent } from '@/components/admin/some-component'
```

### Step 5: Remove Shell Directory

Once all files are moved and tested:

```bash
# Remove empty shell directory
rmdir src/app/\(shell\)
```

### Step 6: Test Migration

**Basic Testing**:
1. Navigate to each protected route
2. Test authentication flows
3. Verify all pages load correctly
4. Check error handling

**Comprehensive Testing**:
1. Test unauthenticated access redirects
2. Test unapproved user access
3. Test deep linking to nested routes
4. Verify bookmark functionality
5. Test browser navigation

## Validation Checklist

### Pre-Migration Checklist
- [ ] Backup current codebase
- [ ] Document current URL structure
- [ ] Run existing test suite
- [ ] Note any existing authentication issues

### Post-Migration Checklist
- [ ] All protected routes load correctly
- [ ] Authentication redirects work properly
- [ ] Unapproved user handling preserved
- [ ] Error boundaries function correctly
- [ ] No broken imports or missing components
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes without errors
- [ ] All existing URLs still work
- [ ] Page load times unchanged
- [ ] Mobile responsiveness preserved

## Troubleshooting

### Common Issues

**Issue**: Pages not loading after migration
**Solution**: Check import statements and file paths

**Issue**: Authentication not working
**Solution**: Verify middleware configuration and Clerk setup

**Issue**: Styling issues on moved pages
**Solution**: Ensure layout components are properly configured

**Issue**: Build errors
**Solution**: Run TypeScript checking to identify issues

### Rollback Plan

If migration fails:
1. Revert to backed up code
2. Verify original functionality restored
3. Investigate failure cause
4. Plan corrected migration approach

## Performance Optimization

### Post-Migration Optimizations

1. **Bundle Analysis**: Check bundle size impact
2. **Route Optimization**: Verify code splitting works correctly
3. **Caching**: Ensure cache invalidation works properly
4. **Monitoring**: Set up performance monitoring

### Expected Benefits

- Simplified file structure
- Improved developer experience
- Better code organization
- Easier maintenance

## Support

For issues during migration:
1. Check this quickstart guide first
2. Review the research documentation
3. Consult the full specification
4. Test thoroughly before deployment

## Next Steps

After successful migration:
1. Update documentation
2. Team training on new structure
3. Monitor for any issues
4. Plan any follow-up improvements

This migration should improve code maintainability while preserving all existing functionality.