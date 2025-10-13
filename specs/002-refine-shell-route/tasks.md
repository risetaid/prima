---
description: "Task list for Refine Shell Route Group Specification implementation"
---

# Tasks: Refine Shell Route Group Specification

**Input**: Design documents from `/specs/002-refine-shell-route/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks included - user explicitly requested no additional testing framework

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/` at repository root
- **Web app**: Next.js App Router structure under `src/app/`
- Paths shown below assume single project structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure preparation

- [X] T001 Create backup branch before shell route group elimination
- [X] T002 Establish TypeScript compilation baseline (run bunx tsc --noEmit and record error count)
- [X] T003 [P] Document current shell directory structure for reference
- [X] T004 Create rollback plan documentation for safety

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Verify TypeScript strict mode is enabled in tsconfig.json
- [X] T006 Validate current authentication patterns are working correctly
- [X] T007 Document all existing import patterns for validation
- [X] T008 Create import path validation script to check for broken references
- [X] T009 Verify all current routes are functional before migration

**Checkpoint**: Foundation ready - shell route group elimination can now begin

---

## Phase 3: User Story 1 - Shell Route Elimination (Priority: P1) 🎯 MVP

**Goal**: Users and developers will experience a simplified routing structure where all content previously under the (shell) route group is moved directly to the app/ directory, eliminating route group complexity while maintaining all existing URLs and functionality.

**Independent Test**: Can be fully tested by verifying that no (shell) route group exists and all previously shell-contained routes work identically under their new direct paths.

### Implementation for User Story 1

- [X] T010 [US1] [P] Move admin directory contents from src/app/(shell)/admin/* to src/app/admin/
- [X] T011 [US1] [P] Move pasien directory contents from src/app/(shell)/pasien/* to src/app/pasien/
- [X] T012 [US1] [P] Move pengingat directory contents from src/app/(shell)/pengingat/* to src/app/pengingat/
- [X] T013 [US1] [P] Move cms directory contents from src/app/(shell)/cms/* to src/app/cms/
- [X] T014 [US1] [P] Move berita directory contents from src/app/(shell)/berita/* to src/app/berita/
- [X] T015 [US1] [P] Move kredit directory contents from src/app/(shell)/kredit/* to src/app/kredit/
- [X] T016 [US1] [P] Move video-edukasi directory contents from src/app/(shell)/video-edukasi/* to src/app/video-edukasi/
- [X] T017 [US1] Remove empty shell directory src/app/(shell)/ after all contents moved
- [X] T018 [US1] Search for and update all import statements referencing shell structure to absolute @/ paths
- [X] T019 [US1] Validate all routes function correctly after shell elimination
- [X] T020 [US1] Verify all existing URLs continue working (admin, pasien, pengingat, cms, berita, kredit, video-edukasi)
- [X] T021 [US1] Confirm authentication flows work identically for all moved routes
- [X] T022 [US1] Validate layout components and error boundaries function correctly

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - TypeScript Strict Mode Compliance (Priority: P1)

**Goal**: The codebase will maintain full TypeScript strict mode compliance throughout the migration process, ensuring no introduction of `any` types or violation of strict typing requirements.

**Independent Test**: Can be verified by running TypeScript compilation with strict mode and ensuring zero errors before and after migration.

### Implementation for User Story 2

- [X] T023 [US2] Run TypeScript compilation to establish post-migration baseline error count
- [X] T024 [US2] [P] Fix any broken import statements that cause TypeScript compilation errors
- [X] T025 [US2] [P] Update any relative imports to absolute @/ paths for TypeScript compliance
- [X] T026 [US2] Validate no `any` types have been introduced during migration
- [X] T027 [US2] Run ESLint to ensure code quality standards are maintained
- [X] T028 [US2] Verify all new code follows strict TypeScript typing requirements
- [X] T029 [US2] Run final TypeScript compilation to ensure zero errors in strict mode
- [X] T030 [US2] Compare error count with baseline to ensure no new TypeScript errors introduced

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Simplified Development Workflow (Priority: P2)

**Goal**: Developers will experience a more intuitive file structure where the direct relationship between URLs and file paths is immediately obvious, reducing cognitive overhead when working with routing.

**Independent Test**: Can be verified by having a developer navigate the file structure and confirm the URL-to-file mapping is intuitive without requiring knowledge of route groups.

### Implementation for User Story 3

- [X] T031 [US3] [P] Validate URL-to-file mapping is immediately obvious (e.g., /admin → src/app/admin/page.tsx)
- [X] T032 [US3] [P] Remove any remaining references to route groups in code comments or documentation
- [X] T033 [US3] Update CLAUDE.md documentation to reflect new simplified routing structure
- [X] T034 [US3] [P] Update any development documentation that references shell routing
- [X] T035 [US3] Create example of new simplified routing workflow for developers
- [X] T036 [US3] Validate that creating new routes follows intuitive pattern without route groups
- [X] T037 [US3] Test developer onboarding experience with simplified structure

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [X] T038 [P] Run comprehensive TypeScript compilation check (bunx tsc --noEmit)
- [X] T039 [P] Run ESLint validation (bun run lint) to ensure code quality
- [X] T040 [P] Verify build process works correctly (bun run build)
- [X] T041 [P] Test all routes in development environment (bun run dev)
- [X] T042 [P] Validate all authentication flows work correctly
- [X] T043 [P] Check all error boundaries and loading states function properly
- [X] T044 [P] Validate performance characteristics (no degradation)
- [X] T045 [P] Create migration summary documentation
- [X] T046 [P] Update any deployment scripts or configuration if needed
- [X] T047 [P] Run final validation against all success criteria (SC-001 through SC-007)
- [X] T048 [P] Create rollback procedure documentation for future reference

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories must proceed sequentially due to file movement dependencies
  - US1 (P1) enables file movement - blocks US2 and US3
  - US2 (P1) validates TypeScript compliance - depends on US1 completion
  - US3 (P2) finalizes developer experience improvements - depends on US1 and US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core shell elimination
- **User Story 2 (P1)**: Depends on US1 completion - requires files moved first
- **User Story 3 (P2)**: Depends on US1 and US2 completion - requires final structure in place

### Within Each User Story

- Directory movement tasks can run in parallel (different directories)
- Import updates must be sequential after directory moves
- TypeScript validation runs after import updates
- Testing runs after implementation tasks

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Directory movement tasks (T010-T016) can run in parallel
- Import path updates (T018, T024, T025) can run in parallel
- Final validation tasks (T038-T047) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all directory moves for User Story 1 together:
Task: "Move admin directory contents from src/app/(shell)/admin/* to src/app/admin/"
Task: "Move pasien directory contents from src/app/(shell)/pasien/* to src/app/pasien/"
Task: "Move pengingat directory contents from src/app/(shell)/pengingat/* to src/app/pengingat/"
Task: "Move cms directory contents from src/app/(shell)/cms/* to src/app/cms/"
Task: "Move berita directory contents from src/app/(shell)/berita/* to src/app/berita/"
Task: "Move kredit directory contents from src/app/(shell)/kredit/* to src/app/kredit/"
Task: "Move video-edukasi directory contents from src/app/(shell)/video-edukasi/* to src/app/video-edukasi/"

# Then proceed with sequential tasks:
Task: "Remove empty shell directory src/app/(shell)/ after all contents moved"
Task: "Search for and update all import statements referencing shell structure"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Shell Route Elimination)
4. **STOP and VALIDATE**: Test shell elimination independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Sequential Team Strategy

This feature requires sequential execution due to file movement dependencies:

1. Team completes Setup + Foundational together
2. Execute User Story 1 (shell elimination) - must complete first
3. Execute User Story 2 (TypeScript validation) - depends on shell elimination
4. Execute User Story 3 (developer experience) - final polish
5. Execute Polish phase for final validation

---

## Success Criteria Validation

Each user story maps to specific success criteria:

**User Story 1** achieves:
- SC-001: 100% shell directory elimination
- SC-002: 100% route functionality preservation
- SC-004: 100% URL preservation
- SC-005: 100% authentication flow preservation

**User Story 2** achieves:
- SC-003: Zero TypeScript compilation errors

**User Story 3** achieves:
- SC-006: Development time improvement
- SC-007: Code simplification achievement

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Focus on TypeScript strict mode compliance (Constitution Principle VI)
- Zero additional testing framework per user preference
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independently
- This is a focused refinement with clear scope boundaries