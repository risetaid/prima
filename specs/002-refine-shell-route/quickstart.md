# Quickstart Guide: Shell Route Group Elimination

**Purpose**: Quick reference for implementing shell route group elimination
**Date**: 2025-01-13

## Overview

This guide provides step-by-step instructions for eliminating the (shell) route group from the Next.js application while maintaining TypeScript strict mode compliance and preserving all functionality.

## Prerequisites

- Node.js 18+ and Bun installed
- Understanding of Next.js 15 routing
- Access to the codebase with Git version control
- TypeScript strict mode enabled in project

## Migration Steps

### Step 1: Pre-Migration Validation

**Establish Baseline**:
```bash
# Run TypeScript compilation to establish baseline
bunx tsc --noEmit
# Record error count - should be zero or known count

# Verify current shell structure exists
ls -la src/app/(shell)

# Test current functionality
bun run dev
# Verify key routes work: /admin, /pasien, /pengingat, /cms
```

### Step 2: Backup Current Structure

**Create Safety Backup**:
```bash
# Create backup branch
git checkout -b backup-before-shell-elimination
git add .
git commit -m "Backup before shell route group elimination"

# Return to feature branch
git checkout 002-refine-shell-route
```

### Step 3: Move Directories from Shell

**Move All Shell Contents**:
```bash
# Move admin directory
mv src/app/\(shell\)/admin/* src/app/admin/

# Move pasien directory
mv src/app/\(shell\)/pasien/* src/app/pasien/

# Move pengingat directory
mv src/app/\(shell\)/pengingat/* src/app/pengingat/

# Move cms directory
mv src/app/\(shell\)/cms/* src/app/cms/

# Move berita directory
mv src/app/\(shell\)/berita/* src/app/berita/

# Move kredit directory
mv src/app/\(shell\)/kredit/* src/app/kredit/

# Move video-edukasi directory
mv src/app/\(shell\)/video-edukasi/* src/app/video-edukasi/

# Remove empty shell directory
rmdir src/app/\(shell\)
```

### Step 4: Update Import Statements

**Find and Replace Shell References**:
```bash
# Search for shell imports
grep -r "(shell)" src/app/ --exclude-dir=node_modules

# Update relative imports to absolute paths
# Example: '../(shell)/admin/components' → '@/components/admin'
```

**Manual Review Required**:
- Check all TypeScript files for shell references
- Update import statements systematically
- Ensure all imports use @/ absolute paths

### Step 5: TypeScript Validation

**Validate Strict Mode Compliance**:
```bash
# Run TypeScript compilation
bunx tsc --noEmit

# Expected Result: Zero errors (same as baseline)
# If errors exist, fix import paths and type issues
```

**Common Issues to Fix**:
- Broken import paths
- Missing type definitions
- Relative import references

### Step 6: ESLint Validation

**Run Code Quality Checks**:
```bash
# Run ESLint
bun run lint

# Expected Result: Zero errors
# Fix any linting issues found
```

### Step 7: Functional Testing

**Test Core Functionality**:
```bash
# Start development server
bun run dev

# Manual Testing Checklist:
- [ ] Navigate to /admin - should load correctly
- [ ] Navigate to /pasien - should load correctly
- [ ] Navigate to /pengingat - should load correctly
- [ ] Navigate to /cms - should load correctly
- [ ] Navigate to /berita - should load correctly
- [ ] Navigate to /kredit - should load correctly
- [ ] Navigate to /video-edukasi - should load correctly
- [ ] Authentication flows work correctly
- [ ] Error boundaries function properly
- [ ] Loading states display correctly
```

### Step 8: Final Validation

**Complete Success Criteria Check**:
```bash
# Verify shell directory eliminated
test ! -d "src/app/(shell)" && echo "✅ SC-001 PASSED: Shell directory eliminated"

# Verify TypeScript compilation
bunx tsc --noEmit && echo "✅ SC-003 PASSED: Zero TypeScript errors"

# Verify build works
bun run build && echo "✅ Build successful"
```

## Validation Checklist

### Pre-Migration ✅
- [ ] TypeScript baseline established (zero errors)
- [ ] Current functionality verified
- [ ] Backup branch created
- [ ] Shell structure documented

### Post-Migration ✅
- [ ] All directories moved successfully
- [ ] Shell directory completely eliminated
- [ ] Import statements updated
- [ ] TypeScript compilation passes (zero errors)
- [ ] ESLint passes (zero errors)
- [ ] All routes load correctly
- [ ] Authentication flows work
- [ ] Build process successful

### Success Criteria Validation ✅
- [ ] SC-001: 100% shell directory elimination
- [ ] SC-002: 100% route functionality preservation
- [ ] SC-003: Zero TypeScript compilation errors
- [ ] SC-004: 100% URL preservation
- [ ] SC-005: 100% authentication flow preservation
- [ ] SC-006: Developer workflow improvement achieved
- [ ] SC-007: Code simplification completed

## Troubleshooting

### Common Issues

**Issue**: TypeScript compilation errors after migration
**Solution**: Check for broken import paths, update to absolute @/ imports

**Issue**: Routes not loading (404 errors)
**Solution**: Verify directory structure matches expected pattern, check page.tsx files exist

**Issue**: Authentication not working
**Solution**: Verify layout components moved correctly, check AuthLoading imports

**Issue**: Build fails
**Solution**: Run TypeScript compilation first, fix all type errors before building

### Rollback Process

If critical issues occur:
```bash
# Rollback to backup
git checkout backup-before-shell-elimination

# Verify original functionality restored
bun run dev
# Test all routes work correctly
```

## Expected Results

After successful migration:
- No (shell) directory exists in src/app/
- All routes work identically to before
- TypeScript compilation passes with zero errors
- Developer experience improved with direct URL-to-file mapping
- Code simplified with no route group complexity

## Next Steps

After successful migration:
1. Update documentation to reflect new structure
2. Commit changes with descriptive message
3. Deploy to staging environment for final verification
4. Merge to main branch when ready

This migration should improve code maintainability while preserving all existing functionality and maintaining strict TypeScript compliance.