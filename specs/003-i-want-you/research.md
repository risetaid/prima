# Research: Remove Testing Infrastructure

**Created**: 2025-10-13
**Status**: Complete
**Objective**: Validate technical approach for removing all testing infrastructure from PRIMA project

## Research Findings

### 1. CI/CD File Discovery

**Decision**: CI/CD files will be scanned and testing references removed as specified in FR-006.

**Rationale**:
- Railway deployment platform likely uses standard build processes
- Testing references in CI/CD could cause build failures if test dependencies are removed
- Removing references ensures clean pipeline without test-related steps

**Alternatives considered**:
- Leave CI/CD files untouched (rejected: could cause build failures)
- Document test references but don't modify (rejected: doesn't meet FR-006 requirement)

### 2. Dependency Impact Analysis

**Decision**: Remove all test dependencies regardless of conflicts as specified in clarifications.

**Rationale**:
- Testing dependencies (@vitest/coverage-v8, @vitest/ui, vitest) are only used for testing
- Core application functionality (Next.js, React, Drizzle) has no dependency on testing framework
- Aggressive approach aligns with user clarification to remove dependencies regardless of conflicts

**Validation**: Core dependencies list shows no reliance on testing infrastructure:
- Next.js 15.4.6 (framework)
- React 19.1.1 (UI library)
- Drizzle ORM (database)
- ioredis (Redis client)
- MinIO (storage)

### 3. Build Process Validation

**Decision**: Build process will continue working without test infrastructure.

**Rationale**:
- Next.js build process is independent of testing framework
- TypeScript compilation (`bunx tsc --noEmit`) doesn't require test files
- ESLint (`bun run lint`) works without test configuration
- No test framework integration in Next.js configuration

**Validation points**:
- `next build` command works without test dependencies
- TypeScript compilation succeeds
- ESLint runs without test-related rules
- Development server starts without test configuration

### 4. Rollback Strategy Validation

**Decision**: Git commit before removal provides adequate rollback capability.

**Rationale**:
- Git provides complete version history and easy rollback
- Single commit captures all testing infrastructure state
- `git revert` can undo the removal if issues occur
- Aligns with standard development practices

**Safety considerations**:
- Commit created before any files are removed
- All removals happen in single atomic operation
- Rollback restores exact previous state

## Technical Implementation Decisions

### File Removal Strategy

1. **Coverage Folder**: Delete `/coverage` directory (~16MB)
2. **Configuration Files**: Remove `vitest.config.ts`
3. **Test Scripts**: Remove 4 test utility scripts from `scripts/` directory
4. **Package.json**: Remove test scripts and devDependencies
5. **CI/CD Files**: Scan and remove testing references

### Dependency Removal Targets

- `@vitest/coverage-v8`
- `@vitest/ui`
- `vitest`

### Script Removal Targets

- `test-cms-api.ts`
- `test-cms-fix.ts`
- `test-consolidated-webhook.ts`
- `test-simple-confirmation.ts`

### NPM Script Removal Targets

- `test`
- `test:ui`
- `test:run`
- `test:coverage`

## Risk Assessment

**Low Risk**: This feature has minimal technical complexity and high predictability.

**Mitigations**:
- Git commit before removal for rollback safety
- Build verification after removal
- Development server verification after removal

## Conclusions

All research completed successfully. No technical blockers identified. The approach is sound and aligns with constitutional requirements and user clarifications.