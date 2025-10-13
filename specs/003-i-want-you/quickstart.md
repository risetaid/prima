# Quickstart: Remove Testing Infrastructure

**Purpose**: Guide for implementing testing infrastructure removal from PRIMA project
**Created**: 2025-10-13
**Prerequisites**: Git repository, Bun package manager

## Overview

This quickstart provides step-by-step instructions for removing all testing infrastructure from the PRIMA project. The process reduces project size by ~20MB and eliminates testing maintenance burden.

## Pre-Implementation Checklist

- [ ] Confirm all development work is saved and committed
- [ ] Verify current branch is `003-i-want-you`
- [ ] Ensure no ongoing deployments or critical operations

## Implementation Steps

### Step 1: Create Rollback Commit

```bash
# Create commit before any changes for rollback safety
git add .
git commit -m "Pre-removal backup: all testing infrastructure intact"
```

### Step 2: Remove Coverage Directory

```bash
# Remove coverage folder (~16MB)
rm -rf coverage/
```

### Step 3: Remove Test Configuration

```bash
# Remove vitest configuration
rm vitest.config.ts
```

### Step 4: Remove Test Scripts

```bash
# Remove test utility scripts
rm scripts/test-cms-api.ts
rm scripts/test-cms-fix.ts
rm scripts/test-consolidated-webhook.ts
rm scripts/test-simple-confirmation.ts
```

### Step 5: Update package.json

Edit `package.json` and remove the following:

**From scripts section:**
```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

**From devDependencies section:**
```json
"@vitest/coverage-v8": "^3.2.4",
"@vitest/ui": "^3.2.4",
"vitest": "^3.2.4"
```

### Step 6: Clean CI/CD References

Scan for and remove testing references from:
- GitHub Actions workflows (.github/workflows/)
- Railway deployment configuration
- Any other CI/CD pipeline files

### Step 7: Verification

```bash
# Verify build still works
bun run build

# Verify development server starts
bun run dev

# Verify linting works
bun run lint

# Verify TypeScript compilation
bunx tsc --noEmit
```

### Step 8: Final Cleanup

```bash
# Remove any remaining test-related node_modules
bun install

# Commit changes
git add .
git commit -m "Remove all testing infrastructure

- Remove coverage/ directory (~16MB)
- Remove vitest.config.ts
- Remove test utility scripts
- Remove test npm scripts and devDependencies
- Clean CI/CD testing references
- Verify build and dev server functionality

Reduces project complexity and maintenance burden"
```

## Verification Checklist

- [ ] `coverage/` directory completely removed
- [ ] `vitest.config.ts` removed
- [ ] All test scripts removed from `scripts/`
- [ ] Test npm scripts removed from package.json
- [ ] Test devDependencies removed from package.json
- [ ] CI/CD files cleaned of test references
- [ ] `bun run build` succeeds
- [ ] `bun run dev` starts successfully
- [ ] `bun run lint` completes without errors
- [ ] `bunx tsc --noEmit` compiles successfully

## Expected Results

- Project size reduced by ~20MB
- npm install time reduced by ~15%
- Zero test-related artifacts remaining
- All core functionality preserved

## Rollback Instructions

If issues occur, rollback with:

```bash
git revert HEAD  # Undo the removal commit
```

This restores all testing infrastructure to its previous state.

## Troubleshooting

### Build Fails After Removal
- Check for any remaining test references in configuration files
- Verify all test dependencies were removed from package.json
- Run `bun install` to refresh dependencies

### Development Server Won't Start
- Ensure vitest.config.ts was completely removed
- Check for test-related imports in source files
- Verify package.json scripts are correct

### TypeScript Compilation Errors
- Look for test-related type imports that may need removal
- Check for test configuration references in tsconfig.json

## Success Criteria

Feature is complete when:
- All verification checklist items pass
- Performance improvements achieved (size/time reductions)
- No test-related artifacts remain in project
- Core application functionality preserved