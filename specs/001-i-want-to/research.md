# Research: Remove Shell Route Group Migration

**Date**: 2025-01-13
**Purpose**: Research migration patterns and authentication strategies for removing Next.js route groups

## Research Summary

This document captures research findings for migrating authenticated pages from `(shell)` route group to direct routing structure while preserving authentication, layouts, and all functionality.

## Key Findings

### 1. Route Group Migration Patterns

**Decision**: Route groups in Next.js are primarily organizational tools that don't affect URL paths. This makes the migration straightforward since URLs will remain unchanged.

**Migration Strategy**: Gradual file system migration with preserved layout inheritance. Route groups don't impact routing logic, only file organization.

**Key Insight**: Since `(shell)` doesn't affect URLs, we can migrate files incrementally without breaking existing links or bookmarks.

### 2. Authentication Layout Redistribution

**Current Shell Layout Components**:
- `AuthLoading` with `requireAuth={true} requireApproval={true}`
- `DashboardErrorBoundary` wrapper
- Basic styling wrapper (`min-h-screen bg-gray-50`)

**Recommended Approach**: Hybrid strategy combining middleware for basic auth checks with layout-based authentication for specific requirements.

**Decision**: Use Next.js middleware for basic authentication + individual layouts for `requireApproval` logic and loading states.

### 3. Layout Inheritance Preservation

**Finding**: Next.js layouts in parent folders automatically wrap child routes. No route groups needed for layout inheritance.

**Strategy**: Create layout files where needed (admin, pasien, etc.) that inherit from root layout while maintaining authentication boundaries.

## Technical Decisions

### Decision 1: Authentication Strategy

**Chosen**: Hybrid approach (middleware + layout-based)

**Rationale**:
- Middleware provides edge-level performance and prevents unauthorized access early
- Layout-based auth maintains rich user experience with loading states
- Preserves existing `AuthLoading` component behavior

**Alternatives Considered**:
- Middleware-only: Rejected due to limited context and loading state capabilities
- Layout-only: Rejected due to performance considerations

### Decision 2: Error Boundary Strategy

**Chosen**: Hierarchical error boundaries

**Implementation**:
- Global error boundary at app level (`app/error.tsx`)
- Dashboard-specific error boundaries in individual layouts
- Preserve existing `DashboardErrorBoundary` component

**Rationale**: Provides both application-wide error handling and route-specific error recovery.

### Decision 3: Migration Phasing

**Chosen**: Incremental migration strategy

**Phases**:
1. Create new direct structure alongside existing `(shell)`
2. Implement middleware for basic auth
3. Move layout components to individual routes
4. Migrate page files incrementally
5. Cleanup and testing

**Rationale**: Reduces risk, allows testing at each phase, ensures zero downtime.

## Migration Architecture

### Target Authentication Flow

```
User Request → Middleware (basic auth) → Layout (requireApproval + loading) → Page Content
```

### Layout Structure After Migration

```
src/app/
├── layout.tsx              # Root layout + basic auth provider
├── admin/
│   └── layout.tsx          # Admin-specific layout + requireApproval
├── pasien/
│   └── layout.tsx          # Patient-specific layout + requireApproval
├── pengingat/
│   └── layout.tsx          # Reminder-specific layout + requireApproval
├── cms/
│   └── layout.tsx          # CMS-specific layout + requireApproval
└── [other routes]/
    └── layout.tsx          # Route-specific layouts as needed
```

### Middleware Configuration

**Protected Routes**: `/admin/*`, `/pasien/*`, `/pengingat/*`, `/cms/*`, `/berita/*`, `/kredit/*`, `/video-edukasi/*`

**Authentication Flow**:
1. Middleware checks basic authentication
2. Redirects unauthenticated users to sign-in
3. Layout components handle `requireApproval` logic
4. Error boundaries provide graceful failure handling

## Performance Considerations

**Expected Impact**: Minimal to positive

**Reasons**:
- Edge-level auth checks reduce unnecessary page renders
- Reduced file system complexity improves build performance
- Hierarchical layouts provide better code splitting

**Monitoring Required**:
- Page load times before/after migration
- Authentication flow completion rates
- Error boundary trigger rates

## Risk Assessment

### Low Risk Items
- File system migration (well-established Next.js pattern)
- URL preservation (route groups don't affect URLs)
- Layout inheritance (automatic Next.js behavior)

### Medium Risk Items
- Authentication flow preservation (requires careful testing)
- Import path updates (automated detection possible)
- Error boundary configuration (thorough testing needed)

### Mitigation Strategies
- Incremental migration with testing at each phase
- Comprehensive test coverage for authentication flows
- Rollback plan for each migration phase

## Validation Criteria

**Must Pass**:
- All existing URLs continue working
- Authentication behavior unchanged (requireAuth + requireApproval)
- Error boundaries function correctly
- No broken imports or missing components
- Performance metrics stable

**Should Pass**:
- Improved developer experience (simplified structure)
- Reduced complexity in routing logic
- Better code organization

## Next Steps

1. **Phase 1**: Create middleware.ts with basic authentication logic
2. **Phase 2**: Create individual layout files for each route section
3. **Phase 3**: Begin incremental page migration
4. **Phase 4**: Testing and validation
5. **Phase 5**: Cleanup and optimization

This research provides a solid foundation for implementing the migration while maintaining all existing functionality and improving the overall architecture.