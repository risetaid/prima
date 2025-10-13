---
description: "Task list for Remove Shell Route Group feature implementation"
---

# Tasks: Remove Shell Route Group

**Input**: Design documents from `/specs/001-i-want-to/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks included - testing approach focuses on TypeScript compilation and ESLint validation per project standards

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

- [ ] T001 Backup current shell structure for rollback capability in src/app/(shell)-backup/
- [ ] T002 Create migration documentation directory in docs/shell-migration/
- [ ] T003 [P] Update development environment variables for middleware testing in .env.local

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create Next.js middleware for basic authentication in src/middleware.ts
- [ ] T005 [P] Create individual route layout templates for all protected sections in src/app/*/layout.tsx
- [ ] T006 [P] Setup import path validation to ensure absolute imports with @/ prefix
- [ ] T007 Configure TypeScript compilation to catch any broken imports during migration
- [ ] T008 Create shell layout deprecation warning system for development

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Simplified Navigation Structure (Priority: P1) 🎯 MVP

**Goal**: Users and administrators experience a cleaner, more direct URL structure without the nested route group complexity. All authenticated pages will be directly accessible under their respective paths without the shell grouping abstraction.

**Independent Test**: Can be fully tested by verifying that all existing authenticated pages remain accessible with the same URLs and functionality after the structural change.

### Implementation for User Story 1

- [ ] T009 [US1] [P] Create admin layout with AuthLoading and DashboardErrorBoundary in src/app/admin/layout.tsx
- [ ] T010 [US1] [P] Create pasien layout with AuthLoading and DashboardErrorBoundary in src/app/pasien/layout.tsx
- [ ] T011 [US1] [P] Create pengingat layout with AuthLoading and DashboardErrorBoundary in src/app/pengingat/layout.tsx
- [ ] T012 [US1] [P] Move admin directory contents from (shell) to direct structure src/app/admin/
- [ ] T013 [US1] [P] Move pasien directory contents from (shell) to direct structure src/app/pasien/
- [ ] T014 [US1] [P] Move pengingat directory contents from (shell) to direct structure src/app/pengingat/
- [ ] T015 [US1] Update import statements in moved admin pages to use absolute paths
- [ ] T016 [US1] Update import statements in moved pasien pages to use absolute paths
- [ ] T017 [US1] Update import statements in moved pengingat pages to use absolute paths
- [ ] T018 [US1] Test all admin routes (/admin, /admin/users, /admin/templates) for accessibility and functionality
- [ ] T019 [US1] Test all pasien routes (/pasien, /pasien/[id], /pasien/[id]/edit) for accessibility and functionality
- [ ] T020 [US1] Test all pengingat routes (/pengingat, /pengingat/pasien/[id]) for accessibility and functionality
- [ ] T021 [US1] Verify authentication redirects work correctly for all moved routes
- [ ] T022 [US1] Validate error boundaries function correctly in new layout structure

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Developer Experience Improvement (Priority: P2)

**Goal**: Developers will have a simpler file structure to work with when creating new pages or modifying existing routes. The removal of the shell route group eliminates the mental overhead of understanding route group nesting.

**Independent Test**: Can be verified by adding a new page to the structure and confirming it follows the same pattern as existing pages without route group complications.

### Implementation for User Story 2

- [ ] T023 [US2] [P] Create cms layout with AuthLoading and DashboardErrorBoundary in src/app/cms/layout.tsx
- [ ] T024 [US2] [P] Create berita layout with AuthLoading and DashboardErrorBoundary in src/app/berita/layout.tsx
- [ ] T025 [US2] [P] Create kredit layout with AuthLoading and DashboardErrorBoundary in src/app/kredit/layout.tsx
- [ ] T026 [US2] [P] Create video-edukasi layout with AuthLoading and DashboardErrorBoundary in src/app/video-edukasi/layout.tsx
- [ ] T027 [US2] [P] Move cms directory contents from (shell) to direct structure src/app/cms/
- [ ] T028 [US2] [P] Move berita directory contents from (shell) to direct structure src/app/berita/
- [ ] T029 [US2] [P] Move kredit directory contents from (shell) to direct structure src/app/kredit/
- [ ] T030 [US2] [P] Move video-edukasi directory contents from (shell) to direct structure src/app/video-edukasi/
- [ ] T031 [US2] [P] Update import statements in moved cms pages to use absolute paths
- [ ] T032 [US2] [P] Update import statements in moved berita pages to use absolute paths
- [ ] T033 [US2] [P] Update import statements in moved kredit pages to use absolute paths
- [ ] T034 [US2] [P] Update import statements in moved video-edukasi pages to use absolute paths
- [ ] T035 [US2] Test all cms routes (/cms, /cms/articles, /cms/videos) for accessibility and functionality
- [ ] T036 [US2] Test berita route (/berita) for accessibility and functionality
- [ ] T037 [US2] Test kredit route (/kredit) for accessibility and functionality
- [ ] T038 [US2] Test video-edukasi route (/video-edukasi) for accessibility and functionality
- [ ] T039 [US2] Create example new page to demonstrate simplified development workflow
- [ ] T040 [US2] Validate route-to-file mapping is immediately obvious without route groups

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Improved URL Consistency (Priority: P3)

**Goal**: All application URLs will follow a consistent pattern without any implicit route group segments that don't appear in the URL but exist in the file structure.

**Independent Test**: Can be verified by comparing URLs with their corresponding file paths and confirming direct mapping relationships.

### Implementation for User Story 3

- [ ] T041 [US3] [P] Validate all URLs directly correspond to their file paths under src/app/
- [ ] T042 [US3] [P] Test API endpoints continue working without any changes to their URL structure
- [ ] T043 [US3] Create URL mapping documentation for development team reference
- [ ] T044 [US3] Validate browser back/forward navigation works correctly for all routes
- [ ] T045 [US3] Test deep linking to nested routes works correctly
- [ ] T046 [US3] Verify bookmark functionality works for all authenticated routes
- [ ] T047 [US3] Validate route parameters are preserved in URL structure
- [ ] T048 [US3] Test dynamic routes with parameters (e.g., /pasien/[id]) work correctly

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T049 [P] Remove empty (shell) directory and shell layout file
- [ ] T050 [P] Update CLAUDE.md documentation to reflect new routing structure
- [ ] T051 [P] Update any remaining documentation that references shell routing
- [ ] T052 [P] Run comprehensive TypeScript compilation check (bunx tsc --noEmit)
- [ ] T053 [P] Run ESLint validation (bun run lint) to ensure code quality
- [ ] T054 [P] Create performance benchmarks to validate no performance degradation
- [ ] T055 [P] Test authentication flows across all migrated routes
- [ ] T056 [P] Validate error handling works consistently across all routes
- [ ] T057 [P] Create migration rollback procedure documentation
- [ ] T058 [P] Update development onboarding documentation with new structure
- [ ] T059 [P] Run final validation checklist from quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 and US2 completion for full URL consistency validation

### Within Each User Story

- Layout creation before page migration (layouts provide authentication framework)
- Page migration before import updates (files need to be in place first)
- Import updates before testing (broken imports prevent testing)
- Testing before moving to next priority (ensure functionality is preserved)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Within each user story, all layout creation tasks marked [P] can run in parallel
- Within each user story, all directory move tasks marked [P] can run in parallel
- Within each user story, all import update tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members after Foundational phase

---

## Parallel Example: User Story 1

```bash
# Launch all layout creation tasks for User Story 1 together:
Task: "Create admin layout with AuthLoading and DashboardErrorBoundary in src/app/admin/layout.tsx"
Task: "Create pasien layout with AuthLoading and DashboardErrorBoundary in src/app/pasien/layout.tsx"
Task: "Create pengingat layout with AuthLoading and DashboardErrorBoundary in src/app/pengingat/layout.tsx"

# Launch all directory move tasks for User Story 1 together:
Task: "Move admin directory contents from (shell) to direct structure src/app/admin/"
Task: "Move pasien directory contents from (shell) to direct structure src/app/pasien/"
Task: "Move pengingat directory contents from (shell) to direct structure src/app/pengingat/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (admin, pasien, pengingat routes)
   - Developer B: User Story 2 (cms, berita, kredit, video-edukasi routes)
   - Developer C: User Story 3 (URL consistency validation and testing)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Focus on TypeScript compilation and ESLint validation instead of formal tests
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **CRITICAL**: Ensure all existing URLs remain functional throughout migration
- **CRITICAL**: Maintain authentication and authorization patterns exactly as before