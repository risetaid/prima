# Routing Contracts: Remove Shell Route Group

**Date**: 2025-01-13
**Purpose**: Define routing contracts and URL preservation requirements for migration

## URL Contracts

### Immutable URLs

**Requirement**: All existing URLs must remain exactly the same after migration

**Protected Route URLs**:

| URL Pattern | Current Source | Target Source | Authentication Required |
|-------------|----------------|---------------|------------------------|
| `/admin` | `(shell)/admin/page.tsx` | `admin/page.tsx` | Yes + Approval |
| `/admin/users` | `(shell)/admin/users/page.tsx` | `admin/users/page.tsx` | Yes + Approval |
| `/admin/templates` | `(shell)/admin/templates/page.tsx` | `admin/templates/page.tsx` | Yes + Approval |
| `/pasien` | `(shell)/pasien/page.tsx` | `pasien/page.tsx` | Yes + Approval |
| `/pasien/[id]` | `(shell)/pasien/[id]/page.tsx` | `pasien/[id]/page.tsx` | Yes + Approval |
| `/pasien/[id]/edit` | `(shell)/pasien/[id]/edit/page.tsx` | `pasien/[id]/edit/page.tsx` | Yes + Approval |
| `/pengingat` | `(shell)/pengingat/page.tsx` | `pengingat/page.tsx` | Yes + Approval |
| `/pengingat/pasien/[id]` | `(shell)/pengingat/pasien/[id]/page.tsx` | `pengingat/pasien/[id]/page.tsx` | Yes + Approval |
| `/cms` | `(shell)/cms/page.tsx` | `cms/page.tsx` | Yes + Approval |
| `/cms/articles` | `(shell)/cms/articles/page.tsx` | `cms/articles/page.tsx` | Yes + Approval |
| `/cms/videos` | `(shell)/cms/videos/page.tsx` | `cms/videos/page.tsx` | Yes + Approval |
| `/berita` | `(shell)/berita/page.tsx` | `berita/page.tsx` | Yes + Approval |
| `/kredit` | `(shell)/kredit/page.tsx` | `kredit/page.tsx` | Yes + Approval |
| `/video-edukasi` | `(shell)/video-edukasi/page.tsx` | `video-edukasi/page.tsx` | Yes + Approval |

**Public Route URLs** (Unchanged):

| URL Pattern | Source | Authentication Required |
|-------------|--------|------------------------|
| `/` | `page.tsx` | No |
| `/sign-in/*` | `sign-in/[[...sign-in]]/page.tsx` | No |
| `/sign-up/*` | `sign-up/[[...sign-up]]/page.tsx` | No |
| `/content/articles/[slug]` | `content/articles/[slug]/page.tsx` | No |
| `/content/videos/[slug]` | `content/videos/[slug]/page.tsx` | No |
| `/unauthorized` | `unauthorized/page.tsx` | No |
| `/pending-approval` | `pending-approval/page.tsx` | No |

## Authentication Contracts

### AuthLoading Component Contract

**Interface**:
```typescript
interface AuthLoadingProps {
  requireAuth: boolean;
  requireApproval: boolean;
  children: React.ReactNode;
}
```

**Behavior Contract**:
- If `requireAuth=true` and user not authenticated → Redirect to `/sign-in`
- If `requireApproval=true` and user not approved → Redirect to `/pending-approval`
- Show loading state during authentication checks
- Preserve intended destination in redirect URL

### Authentication Flow Contract

**Middleware Contract**:
```typescript
interface MiddlewareConfig {
  protectedRoutes: string[];
  publicRoutes: string[];
  authRequired: boolean;
}
```

**Expected Behavior**:
1. Middleware intercepts requests to protected routes
2. Validates Clerk session existence
3. Redirects unauthenticated users to sign-in with return URL
4. Allows authenticated users to proceed to layout components
5. Layout components handle approval requirements

### Error Handling Contract

**DashboardErrorBoundary Contract**:
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
```

**Expected Behavior**:
1. Catch React errors in component tree
2. Log error details to monitoring system
3. Display user-friendly error message
4. Provide retry functionality
5. Preserve application styling and layout

## Layout Contracts

### Layout Hierarchy Contract

**Root Layout** (`src/app/layout.tsx`):
- Must wrap entire application
- Must provide Clerk authentication context
- Must include global styles and meta tags
- Must not require authentication

**Route Layouts** (e.g., `src/app/admin/layout.tsx`):
- Must inherit from root layout
- Must require authentication and approval
- Must include error boundaries
- Must preserve styling wrapper
- Must support nested layouts

### Layout Inheritance Rules

**Rule 1**: Parent layouts automatically wrap child routes
**Rule 2**: Layout.tsx files in route directories create layout boundaries
**Rule 3**: Route groups don't affect URL structure
**Rule 4**: Layout state is preserved during navigation

## Migration Contracts

### File Movement Contract

**Source → Target Mapping**:
```
src/app/(shell)/[directory]/ → src/app/[directory]/
```

**Invariant**: All files maintain relative structure within their parent directories

### Import Path Contract

**Requirement**: All import statements must use absolute paths with `@/` prefix

**Before**:
```typescript
import { SomeComponent } from '../../components/ui/some-component'
```

**After**:
```typescript
import { SomeComponent } from '@/components/ui/some-component'
```

### Component Interface Contract

**Invariant**: All component interfaces and props must remain unchanged

**Layout Components**:
- `AuthLoading` interface unchanged
- `DashboardErrorBoundary` interface unchanged
- All page component interfaces unchanged

## Performance Contracts

### Page Load Time Contract

**Requirement**: Page load times must not increase by more than 5%

**Metrics to Monitor**:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)

### Authentication Flow Contract

**Expected Performance**:
- Authentication check completion: < 500ms
- Redirect completion: < 200ms
- Loading state display: < 100ms

## Testing Contracts

### URL Preservation Test Contract

**Test Cases**:
1. Direct URL navigation to all protected routes
2. Bookmark functionality for all routes
3. Browser back/forward navigation
4. Deep linking to nested routes
5. Route parameter handling

**Expected Results**:
- All URLs load correct content
- No 404 errors for valid URLs
- Authentication redirects work correctly
- Route parameters are preserved

### Authentication Test Contract

**Test Cases**:
1. Unauthenticated user access to protected routes
2. Unapproved user access to protected routes
3. Approved user access to protected routes
4. Session expiration during navigation
5. Multiple tab authentication state

**Expected Results**:
- Proper redirects for unauthenticated users
- Proper redirects for unapproved users
- Successful access for approved users
- Graceful handling of session expiration
- Consistent authentication state across tabs

### Error Handling Test Contract

**Test Cases**:
1. Component errors in protected routes
2. Network errors during page load
3. Authentication service errors
4. Layout rendering errors
5. Boundary condition errors

**Expected Results**:
- Error boundaries catch component errors
- User-friendly error messages displayed
- Retry functionality works correctly
- Application styling preserved
- No application crashes

## Compliance Contracts

### Healthcare Data Protection

**Requirement**: No patient data exposure in error messages or logs

**Implementation**:
- Error messages must be generic for protected routes
- Logs must not contain sensitive patient information
- Authentication failures must not expose user existence

### Accessibility Contract

**Requirement**: All routes must maintain accessibility standards

**Implementation**:
- Proper heading hierarchy maintained
- Screen reader compatibility preserved
- Keyboard navigation functionality intact
- Color contrast requirements met

This contract specification ensures that the route group migration maintains all existing functionality while improving code organization.