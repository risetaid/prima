# Implementation Plan: Remove Testing Infrastructure

**Branch**: `003-i-want-you` | **Date**: 2025-10-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-i-want-you/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Remove all testing infrastructure from the PRIMA project including coverage artifacts, test configurations, npm scripts, devDependencies, and CI/CD references. This reduces project complexity by ~20MB and eliminates maintenance burden while ensuring the application continues to build and run successfully. The approach includes creating a rollback commit and aggressive dependency removal as specified in the clarifications.

## Technical Context

**Language/Version**: TypeScript 5.x with Bun 1.x runtime
**Primary Dependencies**: Next.js 15.4.6, React 19.1.1, Drizzle ORM, ioredis, MinIO
**Storage**: PostgreSQL (Railway), Redis (Railway), MinIO S3-compatible storage
**Testing**: None (being removed) - previously Vitest 3.2.4 with coverage
**Target Platform**: Linux server (Railway deployment)
**Project Type**: Single web application (monorepo structure)
**Performance Goals**: Build <2min, dev server start <30s, 15% faster npm install
**Constraints**: Bun-only package manager, TypeScript-only files, no testing framework
**Scale/Scope**: Healthcare WhatsApp system, ~20MB testing infrastructure to remove

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Constitutional Compliance Assessment

**✅ Principle VI (Bun-Exclusive Package Management)**: This feature ENFORCES the constitution by removing non-Bun testing infrastructure. All operations will use `bun` commands only.

**✅ Principle VII (TypeScript-Only File Structure)**: This feature SUPPORTS the constitution by removing test configurations that might reference non-TypeScript files.

**✅ Principle VIII (Type Safety and Validation)**: Removal of testing framework doesn't impact TypeScript strict mode or Zod validation requirements.

**✅ Development Workflow**: Aligns with constitution by removing test framework dependency, relying on type checking and linting as specified.

**✅ Healthcare Compliance**: No impact on patient data privacy or medical communication boundaries.

**GATE STATUS**: ✅ PASSED - No constitutional violations identified. This feature strengthens constitutional compliance.

## Project Structure

### Documentation (this feature)

```
specs/003-i-want-you/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
prima/                                    # Project root
├── src/                                  # Application source code
│   ├── app/                              # Next.js app router pages
│   ├── components/                       # React components
│   ├── lib/                              # Utility libraries
│   └── services/                         # Business logic services
├── scripts/                              # Build and utility scripts
│   ├── test-cms-api.ts                   # TO BE REMOVED
│   ├── test-cms-fix.ts                   # TO BE REMOVED
│   ├── test-consolidated-webhook.ts      # TO BE REMOVED
│   └── test-simple-confirmation.ts      # TO BE REMOVED
├── coverage/                             # TO BE REMOVED (16MB)
├── vitest.config.ts                      # TO BE REMOVED
├── package.json                          # TO BE MODIFIED (remove test scripts/deps)
└── [CI/CD files]                         # TO BE SCANNED for test references
```

**Structure Decision**: Single web application structure. This feature removes testing infrastructure from existing Next.js application without modifying core application structure.

## Complexity Tracking

*No constitutional violations requiring justification*

This feature simplifies the project by removing testing infrastructure complexity. No additional complexity is introduced.

---

## Phase 0: Research & Decision Making ✅ COMPLETE

### Research Tasks

**Objective**: Resolve all technical unknowns and establish implementation approach for testing infrastructure removal.

**Completed Research**: All research completed successfully. See [research.md](research.md) for detailed findings.

1. **CI/CD File Discovery**: ✅ CI/CD files will be scanned and testing references removed
2. **Dependency Impact Analysis**: ✅ Confirmed test dependencies can be safely removed
3. **Build Process Validation**: ✅ Build system independent of testing infrastructure
4. **Rollback Strategy Validation**: ✅ Git commit provides adequate rollback capability

## Phase 1: Design & Contracts ✅ COMPLETE

### Data Model ✅ COMPLETE

**Decision**: No database changes or new data models required. See [data-model.md](data-model.md).

**Files to be removed**:
- `/coverage` directory (~16MB)
- `vitest.config.ts`
- 4 test utility scripts from `scripts/`
- Test npm scripts and devDependencies from `package.json`

### API Contracts ✅ COMPLETE

**Decision**: No API contracts required. Feature involves only infrastructure cleanup.

### Quickstart Guide ✅ COMPLETE

**Decision**: Step-by-step implementation guide created. See [quickstart.md](quickstart.md).

**Implementation approach**:
1. Create rollback commit
2. Remove coverage directory and config files
3. Remove test scripts and update package.json
4. Clean CI/CD references
5. Verify functionality
6. Commit changes

## Final Constitution Check ✅ PASSED

### Re-evaluation After Design

**✅ Principle VI (Bun-Exclusive Package Management)**:
- Implementation uses only `bun` commands
- Removes non-Bun testing infrastructure
- Strengthens constitutional compliance

**✅ Principle VII (TypeScript-Only File Structure)**:
- Removes test configurations that might reference non-TypeScript files
- No .cjs, .mjs, or .js files introduced
- Maintains TypeScript-only structure

**✅ Principle VIII (Type Safety and Validation)**:
- TypeScript strict mode maintained
- Zod validation preserved
- No impact on type safety

**✅ Development Workflow**:
- Aligns with constitution by removing test framework
- Relies on type checking and linting as specified
- Uses absolute imports and proper naming conventions

**✅ Healthcare Compliance**:
- No impact on patient safety or privacy
- Medical communication boundaries preserved
- Indonesian healthcare standards maintained

**FINAL GATE STATUS**: ✅ PASSED - No constitutional violations. This feature enhances compliance.

---

## Ready for Implementation

**Phase 0**: ✅ Research complete - All technical questions resolved
**Phase 1**: ✅ Design complete - Data model, contracts, and quickstart ready
**Next Step**: Run `/speckit.tasks` to generate detailed implementation tasks

**Generated Artifacts**:
- [research.md](research.md) - Technical research and decisions
- [data-model.md](data-model.md) - Data model impact analysis
- [quickstart.md](quickstart.md) - Step-by-step implementation guide
- [contracts/](contracts/) - API contracts (empty - not needed for this feature)
