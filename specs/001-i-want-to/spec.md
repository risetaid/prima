# Feature Specification: Remove Shell Route Group

**Feature Branch**: `001-i-want-to`
**Created**: 2025-01-13
**Status**: Draft
**Input**: User description: "i want to move the routing from using src\app\(shell) to using src\app directly"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simplified Navigation Structure (Priority: P1)

Users and administrators will experience a cleaner, more direct URL structure without the nested route group complexity. All authenticated pages will be directly accessible under their respective paths without the shell grouping abstraction.

**Why this priority**: This is a fundamental architectural change that affects all users and developers. Simplifying the routing structure improves maintainability and reduces confusion for future development.

**Independent Test**: Can be fully tested by verifying that all existing authenticated pages remain accessible with the same URLs and functionality after the structural change.

**Acceptance Scenarios**:

1. **Given** a user is logged in and approved, **When** they navigate to `/pasien`, **Then** they should see the patient dashboard page as before
2. **Given** an administrator is logged in, **When** they navigate to `/admin/users`, **Then** they should see the user management page as before
3. **Given** a user is logged in, **When** they access `/pengingat/pasien/[id]`, **Then** they should see the patient reminder page as before
4. **Given** an unauthenticated user, **When** they try to access any authenticated route, **Then** they should be redirected to sign-in as before

---

### User Story 2 - Developer Experience Improvement (Priority: P2)

Developers will have a simpler file structure to work with when creating new pages or modifying existing routes. The removal of the shell route group eliminates the mental overhead of understanding route group nesting.

**Why this priority**: Improves developer productivity and reduces the learning curve for new team members joining the project.

**Independent Test**: Can be verified by adding a new page to the structure and confirming it follows the same pattern as existing pages without route group complications.

**Acceptance Scenarios**:

1. **Given** a developer wants to add a new authenticated page, **When** they create the page directory under `src/app/`, **Then** it should automatically inherit authentication requirements
2. **Given** a developer is debugging routing issues, **When** they examine the file structure, **Then** the route-to-file mapping should be immediately obvious without considering route groups

---

### User Story 3 - Improved URL Consistency (Priority: P3)

All application URLs will follow a consistent pattern without any implicit route group segments that don't appear in the URL but exist in the file structure.

**Why this priority**: Ensures URL structure matches file structure expectations, making the application more predictable for both users and developers.

**Independent Test**: Can be verified by comparing URLs with their corresponding file paths and confirming direct mapping relationships.

**Acceptance Scenarios**:

1. **Given** any page in the application, **When** you look at its URL, **Then** it should directly correspond to its file path under `src/app/`
2. **Given** API endpoints, **When** accessed, **Then** they should continue working without any changes to their URL structure

---

### Edge Cases

- What happens to existing bookmarks and saved URLs for authenticated pages?
- How does the change affect middleware that may depend on route group patterns?
- What impact does this have on any dynamic imports or lazy loading that reference the shell structure?
- How are nested layouts within the shell routes handled after the migration?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All existing authenticated pages MUST remain accessible at their current URLs
- **FR-002**: Authentication and authorization logic MUST continue to work exactly as before
- **FR-003**: Layout inheritance from the shell layout MUST be preserved for all affected pages
- **FR-004**: All API endpoints MUST continue functioning without any URL changes
- **FR-005**: The application MUST maintain all existing functionality during and after the migration
- **FR-006**: Error boundaries and loading states MUST continue to work as expected
- **FR-007**: All existing tests (if any) MUST continue to pass after the structural change

### Key Entities *(include if feature involves data)*

- **Authenticated Routes**: All pages currently under `(shell)` directory (admin, pasien, pengingat, cms, berita, kredit, video-edukasi)
- **Layout Components**: Shell layout containing AuthLoading and DashboardErrorBoundary
- **Middleware/Interceptors**: Any code that depends on route group patterns for authentication checks

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing authenticated pages remain accessible without URL changes
- **SC-002**: Zero regression in user authentication flows (measured by existing login success rates)
- **SC-003**: Development time for new pages reduced by 40% due to simplified structure
- **SC-004**: All existing application functionality continues to work with zero breaking changes
- **SC-005**: Code complexity metrics for routing-related code decrease by at least 10%