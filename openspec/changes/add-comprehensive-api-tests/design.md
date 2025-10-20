# Design: Comprehensive API Testing Architecture

## Overview

This document outlines the technical architecture for comprehensive unit testing of PRIMA's API endpoints and webhooks.

## Testing Framework & Stack

### Selected Stack

- **Test Runner:** Vitest (faster than Jest, native Bun support)
- **HTTP Mocking:** nock (lightweight, Fonnte webhook compatible)
- **Async Testing:** Native async/await support
- **Fixtures:** Custom test helpers + real Zod schemas

### Why Vitest?

1. **Bun-native** - PRIMA already uses Bun; eliminates Node.js compatibility layers
2. **ESM-first** - Works with Next.js App Router out of the box
3. **Fast** - 5-10x faster than Jest on large suites
4. **Zero config** - Works with TypeScript automatically
5. **HMR support** - Watch mode for development

## Test Structure

```
tests/
├── api/
│   ├── health.test.ts              # Health checks
│   ├── patients/
│   │   ├── list.test.ts            # GET /api/patients
│   │   ├── create.test.ts          # POST /api/patients
│   │   ├── detail.test.ts          # GET /api/patients/[id]
│   │   ├── actions.test.ts         # Deactivate, reactivate, etc
│   │   ├── reminders.test.ts       # GET /api/patients/[id]/reminders
│   │   └── verification.test.ts    # Verification flows
│   ├── user/
│   │   ├── profile.test.ts         # GET /api/user/profile
│   │   ├── session.test.ts         # GET /api/user/session
│   │   └── status.test.ts          # GET /api/user/status
│   ├── cms/
│   │   ├── articles.test.ts        # Articles CRUD
│   │   └── videos.test.ts          # Videos CRUD
│   ├── webhooks/
│   │   ├── fonnte-incoming.test.ts # Fonnte webhook + idempotency
│   │   └── clerk.test.ts           # Clerk webhook
│   └── ...
├── helpers/
│   ├── setup.ts                    # Test database + auth mocks
│   ├── request-builder.ts          # HTTP request factory
│   ├── mock-fixtures.ts            # Reusable test data
│   └── auth-mocks.ts               # Clerk + auth helpers
└── integration/
    └── end-to-end.test.ts          # Cross-system flows
```

## Testing Patterns

### Pattern 1: API Handler Testing

```typescript
// Test pattern: createApiHandler with different auth levels
describe("GET /api/patients", () => {
  it("should require authentication", async () => {
    // Arrange: No auth token
    // Act: Call endpoint
    // Assert: 401 Unauthorized
  });

  it("should filter by assigned volunteer", async () => {
    // Arrange: Create volunteer + patients
    // Act: Call as volunteer
    // Assert: Only assigned patients returned
  });
});
```

### Pattern 2: Webhook Testing

```typescript
// Fonnte webhook tests
describe("POST /api/webhooks/fonnte/incoming", () => {
  it("should process valid message", async () => {
    // Verify schema validation
    // Verify idempotency (duplicate calls)
    // Verify deduplication
    // Verify database updates
  });

  it("should reject unauthenticated requests", async () => {
    // Missing X-Fonnte-Token header
    // Assert: 401 Unauthorized
  });

  it("should detect duplicate events via idempotency", async () => {
    // Send same message twice
    // Assert: Second request marked as duplicate
  });
});
```

### Pattern 3: Error Path Testing

```typescript
// Validation errors
// Not found errors
// Permission errors
// Database constraint violations
```

## Mock Strategy

### Database Mocking

- Use real Drizzle schemas
- Mock database calls at query level
- Verify SQL structure (optional, via spy)

### Authentication Mocking

- Mock Clerk auth context
- Provide test users with different roles (ADMIN, RELAWAN, DEVELOPER)
- Test permission boundaries

### External Service Mocking

- **Fonnte:** Mock via nock (HTTP mocking)
- **Clerk:** Mock via context injection
- **Redis:** Mock via in-memory store
- **Anthropic API:** Mock via nock

## Test Data Strategy

### Fixtures

- Pre-built test patients, users, articles
- Realistic phone numbers, dates, medical data
- Factories for dynamic data generation

### Cleanup

- Each test runs in isolation
- Database state reset between tests (or use transactions)
- No side effects across test suites

## Idempotency Testing (Fonnte Webhook)

The Fonnte webhook handler includes idempotency logic. Tests verify:

1. **Duplicate detection:** Same `message_id` + `sender` + `timestamp` → marked duplicate
2. **Fallback ID generation:** When `message_id` absent, hash of `sender + timestamp + message` used
3. **Deduplication via Redis:** Duplicate attempts blocked within TTL window
4. **Successful processing:** Valid new messages processed fully

```typescript
// Example: Idempotency test
const payload = {
  sender: "62812345678",
  message: "Test",
  id: "msg-123",
  timestamp: 1234567890,
};

// First call: success
const res1 = await webhook(payload);
expect(res1.status).toBe(200);

// Second call (same payload): duplicate marked
const res2 = await webhook(payload);
expect(res2.data.duplicate).toBe(true);
expect(res2.status).toBe(200); // Still 200, but marked duplicate
```

## Coverage Goals

| Category              | Coverage | Notes                                    |
| --------------------- | -------- | ---------------------------------------- |
| **Health Checks**     | 100%     | 1 endpoint                               |
| **Patient APIs**      | 100%     | 10 endpoints + reminders, verification   |
| **User APIs**         | 100%     | 3 endpoints                              |
| **CMS APIs**          | 90%      | Articles, videos (optional media upload) |
| **Webhook Handlers**  | 100%     | Fonnte + Clerk                           |
| **Error Paths**       | 90%      | Auth, validation, DB errors              |
| **Permission Checks** | 100%     | Admin, volunteer, user roles             |

**Target:** 85%+ code coverage for API layer

## CI/CD Integration

### Pre-commit Hook

```bash
bun test --run --coverage
```

### CI Pipeline

```yaml
- Run: bun test --run
- Coverage: Generate coverage report
- Assert: Min 80% coverage for modified files
- Fail: If any tests fail
```

## Performance Considerations

- **Parallel execution:** Vitest runs tests in parallel by default (can be tuned)
- **Watch mode:** HMR for development, re-run affected tests
- **Test isolation:** Each test independent, no shared state
- **Timeout handling:** 5-10s per test (configurable)

## Documentation Strategy

### In Code

- JSDoc comments on test suites
- Inline comments for complex assertions
- Descriptive test names (spec-style)

### External (DOCX)

- Overview of testing strategy
- API endpoint catalog with test coverage
- Webhook testing approach
- Setup and running instructions
- Coverage metrics
- Maintenance guidelines

---

## Implementation Order

1. **Vitest setup** - Config, helpers, fixtures
2. **Health + user tests** - Simple, establishes patterns
3. **Patient tests** - Complex, CRUD + relationships
4. **CMS tests** - Moderate complexity
5. **Webhook tests** - Idempotency, deduplication
6. **Documentation** - DOCX generation
7. **CI/CD** - Add test gate to pipeline

---

## Future Enhancements

- Performance testing (endpoint response times)
- Load testing (concurrent requests)
- Contract testing (frontend-backend agreement)
- Snapshot testing (response payloads)
- Mutation testing (test quality verification)
