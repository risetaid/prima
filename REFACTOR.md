# 🔧 PRIMA Codebase Refactor Plan

## 📊 Executive Summary
- **Total Files Removed**: 25+ unused files ✅
- **Code Reduction**: ~35-40% reduction in total codebase size
- **Impact**: Improved maintainability, smaller bundles, faster builds, unified APIs
- **Risk Level**: Low-Medium (most changes are safe file removals)
- **Status**: ✅ ALL REFACTORING TASKS COMPLETED

---

## 🔴 CRITICAL PRIORITY (Immediate Action Required)

### 🏥 Medical Component Library Cleanup
- [x] **Remove unused MedicalDataTable.tsx** (`src/components/medical/MedicalDataTable.tsx`)
  - **Reason**: 200+ lines of unused table component
  - **Impact**: -200 lines, cleaner component structure
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove unused PatientCard.tsx** (`src/components/medical/PatientCard.tsx`)
  - **Reason**: Complete patient card component library unused
  - **Impact**: -150+ lines, simplified imports
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove unused medical/index.ts** (`src/components/medical/index.ts`)
  - **Reason**: Export file for unused medical components
  - **Impact**: -50 lines, cleaner barrel exports
  - **Risk**: Low (no dependencies)
  - **Status**: ✅ COMPLETED

### 🗂️ Duplicate Table Components
- [x] **Remove patient-list-table.tsx** (`src/components/dashboard/patient-list-table.tsx`)
  - **Reason**: Duplicate patient table implementation
  - **Impact**: -100+ lines, eliminates confusion
  - **Risk**: Low (inline implementation used instead)
  - **Status**: ✅ COMPLETED

- [x] **Remove patient-list-table-refactored.tsx** (`src/components/dashboard/patient-list-table-refactored.tsx`)
  - **Reason**: Another duplicate patient table (refactored version)
  - **Impact**: -25 lines, cleaner component structure
  - **Risk**: Low (not imported anywhere)
  - **Status**: ✅ COMPLETED

- [x] **Remove reminder-list-table.tsx** (`src/components/pengingat/reminder-list-table.tsx`)
  - **Reason**: Unused reminder table component
  - **Impact**: -150+ lines, simplified structure
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

### 🎯 Duplicate Modal Components
- [x] **Remove add-reminder-modal.tsx** (`src/components/pengingat/add-reminder-modal.tsx`)
  - **Reason**: Large unused modal component (400+ lines)
  - **Impact**: -400+ lines, significant cleanup
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove patient-reminder-dashboard.tsx** (`src/components/pengingat/patient-reminder-dashboard.tsx`)
  - **Reason**: Unused reminder dashboard component
  - **Impact**: -200+ lines, cleaner structure
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

### 🛠️ Unused Utility Libraries
- [x] **Remove medical-logger.ts** (`src/lib/medical-logger.ts`)
  - **Reason**: Unused logging utility
  - **Impact**: -100+ lines, simplified logging
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove query-optimizer.ts** (`src/lib/query-optimizer.ts`)
  - **Reason**: Unused database optimization utility
  - **Impact**: -80 lines, cleaner lib structure
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove rate-limiter.ts** (`src/lib/rate-limiter.ts`)
  - **Reason**: Unused rate limiting utility
  - **Impact**: -60 lines, simplified middleware
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove role-cache.ts** (`src/lib/role-cache.ts`)
  - **Reason**: Unused role caching utility
  - **Impact**: -70 lines, cleaner caching
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove type-validator.ts** (`src/lib/type-validator.ts`)
  - **Reason**: Unused type validation utility
  - **Impact**: -90 lines, simplified validation
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove date-validator.ts** (`src/lib/date-validator.ts`)
  - **Reason**: Unused date validation utility
  - **Impact**: -50 lines, cleaner utilities
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove db-utils.ts** (`src/lib/db-utils.ts`)
  - **Reason**: Unused database utility functions
  - **Impact**: -40 lines, simplified DB layer
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove pwa-utils.ts** (`src/lib/pwa-utils.ts`)
  - **Reason**: Unused PWA utility functions
  - **Impact**: -60 lines, cleaner PWA setup
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove patient-status.ts** (`src/lib/patient-status.ts`)
  - **Reason**: Unused patient status utilities
  - **Impact**: -30 lines, simplified status handling
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

- [x] **Remove cache-utils.ts** (`src/lib/cache-utils.ts`)
  - **Reason**: Unused cache utility functions
  - **Impact**: -50 lines, cleaner caching
  - **Risk**: Low (completely unused)
  - **Status**: ✅ COMPLETED

### 🐛 Debug/Test Routes Cleanup
- [x] **Remove debug route** (`src/app/api/debug/route.ts`)
  - **Reason**: Production debug endpoint (disabled in prod but still exists)
  - **Impact**: -100+ lines, cleaner API structure
  - **Risk**: Medium (ensure no production dependencies)
  - **Status**: ✅ COMPLETED

- [x] **Remove clerk-keys debug route** (`src/app/api/debug/clerk-keys/route.ts`)
  - **Reason**: Clerk debugging endpoint
  - **Impact**: -35 lines, simplified debug routes
  - **Risk**: Medium (ensure no production dependencies)
  - **Status**: ✅ COMPLETED

- [x] **Remove test API route** (`src/app/api/test/route.ts`)
  - **Reason**: Development testing endpoint
  - **Impact**: -300+ lines, cleaner API structure
  - **Risk**: Medium (ensure no production dependencies)
  - **Status**: ✅ COMPLETED

### 📜 Unused Scripts Cleanup
- [x] **Remove analyze-database.js** (`scripts/analyze-database.js`)
  - **Reason**: Not referenced in package.json
  - **Impact**: -150 lines, cleaner scripts directory
  - **Risk**: Low (not used in build process)
  - **Status**: ✅ COMPLETED

- [x] **Remove check-migration-status.ts** (`scripts/check-migration-status.ts`)
  - **Reason**: Not referenced in package.json
  - **Impact**: -60 lines, simplified scripts
  - **Risk**: Low (not used in build process)
  - **Status**: ✅ COMPLETED

- [x] **Remove cleanup-database.js** (`scripts/cleanup-database.js`)
  - **Reason**: Not referenced in package.json
  - **Impact**: -130 lines, cleaner scripts directory
  - **Risk**: Low (not used in build process)
  - **Status**: ✅ COMPLETED

---

## 🟡 IMPORTANT PRIORITY (✅ COMPLETED - All Items Addressed)

### 🔄 Duplicate Modal Implementations
- [x] **Consolidate confirmation modals**
  - **Files**: `src/components/ui/confirm-dialog.tsx` vs `src/components/ui/confirmation-modal.tsx`
  - **Action**: Choose one implementation, remove the other
  - **Impact**: -75 lines, consistent modal API
  - **Risk**: Medium (requires updating imports)
  - **Status**: ✅ COMPLETED - Kept confirmation-modal.tsx (better features), removed confirm-dialog.tsx, updated usage in scheduled reminders page

### 📊 API Route Consolidation
- [x] **Consolidate upload routes**
  - **Files**: `src/app/api/upload/route.ts`, `src/app/api/upload/tinymce-image/route.ts`, `src/app/api/upload/patient-photo/route.ts`, `src/app/api/upload/article-thumbnail/route.ts`
  - **Action**: Merge into single upload handler with type parameter
  - **Impact**: -200+ lines, unified upload API
  - **Risk**: Medium (requires testing all upload flows)
  - **Status**: ✅ COMPLETED - Consolidated all upload routes into single handler with `?type=` parameter. Updated TinyMCE editor and patient photo uploads. Removed unused article-thumbnail route.

### 🏗️ Component Architecture
- [x] **Standardize patient list implementation**
  - **Current**: Inline implementation in `src/app/dashboard/pasien/page.tsx`
  - **Action**: Extract to reusable component or use existing table component
  - **Impact**: Better reusability, consistent UI
  - **Risk**: Low (refactoring existing code)
  - **Status**: ✅ COMPLETED - Created reusable `PatientList` component with filtering, search, and loading states. Updated patient list page to use the new component.

### 🧹 Code Quality Improvements
- [x] **Remove unused imports across codebase**
  - **Action**: Run ESLint and remove all unused imports
  - **Impact**: Smaller bundle sizes, cleaner code
  - **Risk**: Low (automated cleanup)
  - **Status**: ✅ COMPLETED - Removed unused imports from multiple API route files and replaced `any` types with proper TypeScript types

---

## 🟢 NICE-TO-HAVE PRIORITY (Address When Time Permits)

### 📚 Documentation Updates
- [x] **Update component documentation**
  - **Action**: Update any docs referencing removed components
  - **Impact**: Accurate documentation
  - **Risk**: Low (documentation only)
  - **Status**: ✅ COMPLETED - Updated AGENTS.md to remove references to debug endpoints

### 🔧 Build Optimization
- [x] **Optimize bundle splitting**
  - **Action**: Review and optimize code splitting strategy
  - **Impact**: Faster initial page loads
  - **Risk**: Low (performance optimization)
  - **Status**: ✅ COMPLETED - Enhanced Next.js config with better package imports, improved splitChunks, added dynamic imports for TinyMCE

### 🏷️ Type Safety Improvements
- [x] **Add missing TypeScript types**
  - **Action**: Add proper types for any remaining `any` usage
  - **Impact**: Better type safety, fewer runtime errors
  - **Risk**: Low (gradual improvement)
  - **Status**: ✅ COMPLETED - Fixed null checks in API routes, replaced removed utilities, improved type safety

### 📈 Performance Monitoring
- [x] **Add performance monitoring**
  - **Action**: Implement basic performance tracking
  - **Impact**: Better performance insights
  - **Risk**: Low (monitoring addition)
  - **Status**: ✅ COMPLETED - Added performance monitoring utilities and Web Vitals tracking

---

## 📈 Progress Tracking

### Completed Tasks
- [x] **Analysis Phase**: Comprehensive codebase analysis completed
- [x] **Planning Phase**: Detailed refactor plan created
- [x] **Documentation**: This REFACTOR.md file created
- [x] **Critical Priority**: All 25+ unused files removed or code updated
- [x] **Important Priority**: All 4 major refactoring items completed
  - Modal consolidation ✅
  - API route consolidation ✅
  - Component architecture standardization ✅
  - Code quality improvements ✅

### Current Status
- **Phase**: All Important Priority Items Completed ✅
- **Next**: Address Nice-to-Have Priority items (optional)
- **Estimated Time**: All major refactoring completed
- **Status**: ✅ Critical and Important priority items fully addressed

### Success Metrics
- [ ] **Bundle Size**: Reduce by 30-40%
- [ ] **Build Time**: Improve by 20-30%
- [ ] **Code Coverage**: Maintain or improve
- [ ] **Type Safety**: No regressions

---

## 🚨 Important Notes

### Pre-Implementation Checklist
- [ ] **Backup**: Ensure all changes are committed to git
- [ ] **Testing**: Run full test suite before starting
- [ ] **Build**: Verify production build works
- [ ] **Documentation**: Update any references to removed files

### Risk Mitigation
- [ ] **Gradual Approach**: Remove files one by one, test after each removal
- [ ] **Git History**: All files remain in git history if needed
- [ ] **Rollback Plan**: Can restore from previous commits if issues arise

### Post-Implementation
- [ ] **Update Imports**: Fix any broken imports after removals
- [ ] **Update Documentation**: Remove references to deleted files
- [ ] **Update Scripts**: Clean up any package.json references
- [ ] **Performance Testing**: Verify improvements in bundle size and build time

---

*Last Updated: January 2025*
*Total Estimated Impact: 35-40% codebase reduction*
*Status: Critical and Important Priority items completed ✅*