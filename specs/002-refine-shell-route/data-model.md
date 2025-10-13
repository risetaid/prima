# Data Model: Refined Shell Route Group Elimination

**Date**: 2025-01-13
**Purpose**: Document entities and structure for focused shell route group elimination

## Overview

This feature focuses exclusively on file system restructuring and import path management. No new data entities are created, but existing layout and authentication components must be preserved during the migration.

## File System Entities

### 1. Shell Route Group Directory

**Current Location**: `src/app/(shell)/`

**Purpose**: Organizational container for authenticated routes

**Target State**: Completely eliminated

**Contents to be Migrated**:
- `admin/` directory and all subdirectories
- `pasien/` directory and all subdirectories
- `pengingat/` directory and all subdirectories
- `cms/` directory and all subdirectories
- `berita/` directory and all subdirectories
- `kredit/` directory and all subdirectories
- `video-edukasi/` directory and all subdirectories
- `layout.tsx` (shell layout component)

### 2. Target Route Directories

**Target Location**: `src/app/` (direct placement)

**Migration Pattern**:
```
src/app/(shell)/[directory]/ → src/app/[directory]/
```

**Preserved Structure**: All subdirectories and files maintain relative positions

### 3. Layout Components

**Shell Layout** (`src/app/(shell)/layout.tsx`):
- Contains AuthLoading with requireAuth and requireApproval
- Contains DashboardErrorBoundary wrapper
- Provides styling wrapper with min-h-screen bg-gray-50

**Migration Strategy**: Layout functionality to be preserved through file movement and import updates

## Import Path Entities

### 1. Relative Import References

**Pattern**: Imports referencing `../(shell)/` or similar relative paths

**Examples**:
```typescript
import { Component } from '../(shell)/admin/components/component'
import { Utility } from '../../(shell)/shared/utils'
```

**Target State**: All relative imports updated to absolute @/ paths

### 2. Absolute Import Compliance

**Pattern**: Imports using `@/` prefix (existing pattern to maintain)

**Examples**:
```typescript
import { Component } from '@/components/admin/component'
import { Utility } from '@/lib/utils'
```

**Validation Requirement**: All imports must use absolute paths per project standards

## TypeScript Compliance Entities

### 1. Type Safety Validation

**Requirement**: Zero TypeScript compilation errors in strict mode

**Validation Points**:
- Before migration: Establish baseline error count
- During migration: Check for new errors after each operation
- After migration: Ensure zero errors (same as baseline)

### 2. Strict Mode Enforcement

**Requirement**: No `any` types allowed per Constitution Principle VI

**Validation Approach**:
- TypeScript compiler strict mode enforcement
- ESLint rules for type safety
- Manual code review for new code patterns

## Migration State Tracking

### 1. Directory Structure States

**Initial State**: Shell route group exists with all subdirectories
**Intermediate State**: Files moved, imports updated
**Final State**: Shell directory eliminated, all functionality preserved

### 2. Validation States

**Pre-Migration**: TypeScript compilation baseline established
**During Migration**: Progressive validation at each step
**Post-Migration**: Full validation against success criteria

## Success Metrics

### Measurable Outcomes

**SC-001**: 100% shell directory elimination
- Verification: `src/app/(shell)` directory no longer exists
- Measurement: Directory presence check

**SC-003**: Zero TypeScript errors
- Verification: `bunx tsc --noEmit` returns zero errors
- Measurement: Error count comparison (before vs after)

**SC-006**: Developer workflow improvement
- Verification: Direct URL-to-file mapping without route groups
- Measurement: Cognitive load assessment (no shell complexity)

## Risk Mitigation

### Import Path Validation

**Risk**: Broken imports after file movement
**Mitigation**: Systematic search and replace with validation

### TypeScript Compliance

**Risk**: Introduction of type errors during migration
**Mitigation**: Step-by-step validation with rollback capability

### Functionality Preservation

**Risk**: Layout or authentication broken after migration
**Mitigation**: Preserve existing component structure, only update paths

## Dependencies

### External Dependencies

- Next.js 15: Route group functionality
- TypeScript 5.3+: Strict mode compilation
- React 19: Component structure preservation

### Internal Dependencies

- Existing AuthLoading component
- Existing DashboardErrorBoundary component
- Current absolute import patterns

This data model provides the foundation for implementing shell route group elimination while maintaining all existing functionality and TypeScript compliance requirements.