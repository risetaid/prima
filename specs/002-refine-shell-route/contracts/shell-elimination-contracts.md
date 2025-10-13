# Shell Elimination Contracts

**Date**: 2025-01-13
**Purpose**: Define contracts for shell route group elimination with TypeScript compliance

## File System Contracts

### Directory Elimination Contract

**Source Structure**:
```
src/app/(shell)/
├── admin/
├── pasien/
├── pengingat/
├── cms/
├── berita/
├── kredit/
├── video-edukasi/
└── layout.tsx
```

**Target Structure**:
```
src/app/
├── admin/
├── pasien/
├── pengingat/
├── cms/
├── berita/
├── kredit/
├── video-edukasi/
└── (shell) directory eliminated
```

**Contract Requirements**:
- All directories under (shell) must be moved directly to src/app/
- All subdirectories and files must maintain relative structure
- The (shell) directory must be completely eliminated
- No files should be lost or modified during movement

### URL Preservation Contract

**Invariant**: All existing URLs must continue working exactly as before

**URL Mapping**:
| Current URL | Current Source | Target Source | Verification Required |
|-------------|----------------|---------------|----------------------|
| `/admin` | `(shell)/admin/page.tsx` | `admin/page.tsx` | ✅ Yes |
| `/admin/users` | `(shell)/admin/users/page.tsx` | `admin/users/page.tsx` | ✅ Yes |
| `/pasien` | `(shell)/pasien/page.tsx` | `pasien/page.tsx` | ✅ Yes |
| `/pasien/[id]` | `(shell)/pasien/[id]/page.tsx` | `pasien/[id]/page.tsx` | ✅ Yes |
| `/pengingat` | `(shell)/pengingat/page.tsx` | `pengingat/page.tsx` | ✅ Yes |
| `/cms` | `(shell)/cms/page.tsx` | `cms/page.tsx` | ✅ Yes |
| `/berita` | `(shell)/berita/page.tsx` | `berita/page.tsx` | ✅ Yes |
| `/kredit` | `(shell)/kredit/page.tsx` | `kredit/page.tsx` | ✅ Yes |
| `/video-edukasi` | `(shell)/video-edukasi/page.tsx` | `video-edukasi/page.tsx` | ✅ Yes |

## TypeScript Compliance Contracts

### Strict Mode Validation Contract

**Requirement**: Zero TypeScript compilation errors in strict mode before and after migration

**Validation Process**:
1. Run `bunx tsc --noEmit` before migration - record error count
2. Run `bunx tsc --noEmit` after migration - error count must be same or lower
3. No new `any` types introduced
4. All import paths must resolve correctly

**Success Criteria**:
- Post-migration error count ≤ pre-migration error count
- Zero new type errors introduced
- All imports resolve without errors

### Import Path Compliance Contract

**Requirement**: All imports must use absolute paths with @/ prefix

**Invalid Patterns**:
```typescript
import { Component } from '../(shell)/admin/components/component'
import { Utility } from '../../shared/utils'
```

**Valid Patterns**:
```typescript
import { Component } from '@/components/admin/component'
import { Utility } from '@/lib/utils'
```

**Validation Requirements**:
- No relative imports referencing (shell) structure
- All imports must use @/ absolute paths
- No broken import paths after migration

## Functionality Preservation Contracts

### Authentication Flow Contract

**Requirement**: Authentication and authorization must work identically after migration

**Verification Requirements**:
- Login/logout flows unchanged
- Protected routes still require authentication
- Unauthenticated users redirected appropriately
- Approved user access maintained

### Layout Functionality Contract

**Requirement**: Layout components must function identically after migration

**Components to Preserve**:
- AuthLoading component with requireAuth and requireApproval
- DashboardErrorBoundary wrapper
- Styling wrapper (min-h-screen bg-gray-50)

**Verification Requirements**:
- Layout styling preserved
- Error boundaries function correctly
- Loading states display properly
- Authentication checks work as before

## Performance Contracts

### Compilation Performance Contract

**Requirement**: Migration must not degrade build performance

**Metrics**:
- TypeScript compilation time must not increase significantly
- Build bundle size must remain consistent
- No new dependencies introduced

### Runtime Performance Contract

**Requirement**: Application performance must remain unchanged

**Metrics**:
- Page load times unchanged
- Route navigation speed maintained
- Memory usage consistent
- No new runtime errors

## Validation Contracts

### Success Criteria Validation Contract

**SC-001**: 100% shell directory elimination
```bash
# Verification command
test ! -d "src/app/(shell)" && echo "SUCCESS: Shell directory eliminated" || echo "FAILURE: Shell directory still exists"
```

**SC-002**: 100% route functionality preservation
- Manual verification of all routes
- Automated link checking where possible
- User acceptance testing

**SC-003**: Zero TypeScript compilation errors
```bash
# Verification commands
bunx tsc --noEmit
# Expected: zero errors, zero warnings
```

**SC-004**: 100% URL preservation
- Link checker validation
- Bookmark functionality testing
- Deep link verification

**SC-005**: 100% authentication flow preservation
- Login/logout testing
- Protected route access testing
- Session management verification

**SC-006**: Developer workflow improvement
- Direct URL-to-file mapping verification
- Route structure simplicity assessment
- Developer feedback collection

**SC-007**: Code simplification achievement
- Zero references to route groups in code
- Documentation updated
- Comments simplified

## Rollback Contracts

### Rollback Capability Contract

**Requirement**: Ability to rollback changes if issues discovered

**Rollback Process**:
1. Git reset to pre-migration commit
2. Verification of original functionality restored
3. Documentation of rollback reason

**Rollback Triggers**:
- TypeScript compilation errors persist
- Critical functionality broken
- Performance degradation significant
- Authentication flows compromised

These contracts ensure comprehensive validation of the shell route group elimination process while maintaining all existing functionality and TypeScript compliance requirements.