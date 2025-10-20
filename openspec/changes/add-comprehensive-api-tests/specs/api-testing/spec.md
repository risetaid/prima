# Specification: API Testing Capability

## Overview

The API Testing capability provides comprehensive unit test coverage for PRIMA's API endpoints and webhook handlers, ensuring reliability, preventing regressions, and documenting API contracts.

## ADDED Requirements

### Requirement: Comprehensive Unit Tests for All API Endpoints

The system SHALL provide complete unit test coverage for all 34+ API endpoints, including:

- Health checks and system status
- Patient management (CRUD, reminders, verification)
- User management (profile, session, status)
- CMS (articles, videos, content)
- Upload operations
- Dashboard aggregation
- YouTube integration

#### Scenario: Testing patient list endpoint with pagination

```typescript
Given a volunteer with 5 assigned patients
When the volunteer calls GET /api/patients?page=1&limit=2
Then the response should contain 2 patients
And the response should include pagination metadata
And the volunteer should only see their assigned patients
```

#### Scenario: Testing unauthorized access

```typescript
When an unauthenticated user calls GET /api/patients
Then the response should be 401 Unauthorized
And no patient data should be returned
```

#### Scenario: Testing patient creation validation

```typescript
Given a valid patient creation request with required fields
When the request is sent to POST /api/patients
Then the patient should be created in the database
And the response should include the new patient ID
And the phone number should be normalized (0xxx → 62xxx)
```

### Requirement: Fonnte Webhook Integration Tests

The system SHALL provide comprehensive tests for the Fonnte incoming webhook handler, including:

- Message validation and normalization
- Idempotency detection (duplicate message handling)
- Deduplication via Redis cache
- Fallback ID generation when message_id is missing
- Confirmation and verification processing
- Authentication verification

#### Scenario: Processing valid Fonnte message

```typescript
Given a valid incoming Fonnte message with sender and message content
When the message is posted to POST /api/webhooks/fonnte/incoming
Then the message should be processed
And the confirmation status should be tracked in the database
And an idempotency key should be stored in Redis
```

#### Scenario: Detecting duplicate message (idempotency)

```typescript
Given a Fonnte message with id="msg-123" from sender="62812345678"
When the same message is received twice (same id, sender, timestamp)
Then the first request should process normally
And the second request should be marked as duplicate
And only one database entry should exist
```

#### Scenario: Fallback ID generation for missing message_id

```typescript
Given a Fonnte message WITHOUT an explicit message_id
When the message is received
Then a fallback ID should be generated from hash(sender + timestamp + message)
Then the message should be deduplicated using this fallback ID
```

#### Scenario: Rejecting unauthenticated webhook

```typescript
Given a Fonnte webhook request without X-Fonnte-Token header
When the request is sent to POST /api/webhooks/fonnte/incoming
Then the response should be 401 Unauthorized
And no message should be processed
```

### Requirement: Test Infrastructure & Helpers

The system SHALL provide reusable test infrastructure including:

- Vitest configuration for Next.js App Router
- Mock fixtures for patients, users, articles
- Authentication mock utilities
- Database mock factories
- HTTP request builders

#### Scenario: Setting up authenticated test request

```typescript
Given test helpers are available
When a test creates an authenticated request using buildRequest()
Then the request should include valid auth headers
And the user context should be injected into the API handler
```

### Requirement: Error Path Testing

The system SHALL comprehensively test error conditions:

- 400 Validation errors (invalid phone, missing fields)
- 401 Unauthorized (missing auth)
- 403 Forbidden (insufficient permissions)
- 404 Not Found (patient/article doesn't exist)
- 409 Conflict (duplicate phone number)
- 429 Rate Limited
- 500 Server errors (DB failures, service unavailable)

#### Scenario: Handling validation error

```typescript
When a POST /api/patients request has invalid phone number
Then the response should be 400
And the response should include field-level error details
And the patient should NOT be created
```

### Requirement: Permission & Role-Based Access Tests

The system SHALL verify permission boundaries:

- ADMIN can access all resources
- RELAWAN can only see assigned patients
- DEVELOPER can access system endpoints
- Unauthenticated users cannot access protected endpoints

#### Scenario: Volunteer accessing only assigned patients

```typescript
Given Volunteer A assigned to Patients P1 and P2
And Volunteer B assigned to Patient P3
When Volunteer A calls GET /api/patients
Then only P1 and P2 should be returned
And P3 should NOT be visible
```

### Requirement: Test Coverage Metrics & Reporting

The system SHALL track and report test coverage:

- Line coverage for API layer (target ≥80%)
- Branch coverage for conditional logic
- Function coverage for all handlers
- Coverage reports via Vitest

#### Scenario: Generating coverage report

```typescript
When the test suite runs with --coverage flag
Then a coverage report should be generated
And coverage metrics should show ≥80% for src/app/api/**
```

## MODIFIED Requirements

### Requirement: API Development Process (existing pattern)

**MODIFIED:** Added requirement for tests when:

- Adding new API endpoints
- Modifying existing endpoint behavior
- Changing authentication/permission logic
- Updating validation schemas

**Before:** No formal test requirement
**After:** New endpoints must include unit tests at merge time

#### Scenario: Adding new patient endpoint

```typescript
When a developer adds a new POST /api/patients/[id]/new-action endpoint
Then unit tests for this endpoint MUST be committed
And tests must cover at least:
  - Happy path (valid data)
  - Validation errors
  - Permission checks
  - Not found case
```

## REMOVED Requirements

None. This is additive.

---

## Test Patterns

### API Handler Pattern

All tests use the `createApiHandler` wrapper pattern:

```typescript
describe("GET /api/patients", () => {
  it("should list patients with auth", async () => {
    const { getByRole } = await setupTest({ auth: "required" });
    // Test implementation
  });
});
```

### Arrange-Act-Assert

All tests follow AAA pattern:

```typescript
// Arrange: Set up test data, mocks
const mockPatient = { id: "1", name: "John" };

// Act: Execute the function under test
const response = await handler(mockPatient);

// Assert: Verify the outcome
expect(response.status).toBe(200);
expect(response.data.id).toBe("1");
```

### Webhook Idempotency Pattern

```typescript
// Send same webhook twice
await handler(payload); // First call
await handler(payload); // Second call (duplicate)

// Verify only one entry in database
const count = await db.select().from(confirmations);
expect(count).toBe(1);
```

---

## Dependencies

- **vitest** - Test framework
- **nock** - HTTP mocking
- **@testing-library/react** - Component testing (if needed)
- **dotenv** - Environment variable loading in tests

---

## Implementation Notes

- All tests run in isolation (no shared state between tests)
- Database mocks prevent actual data modifications
- Webhook tests verify both success and error paths
- Idempotency tests confirm Redis deduplication
- Coverage reports generated after each test run
- CI/CD pipeline enforces minimum coverage (80%)
