# PRIMA Testing Guide

<!-- Test fixtures only - see tests/ directory for credentials which are all marked as test data -->

## Overview

PRIMA now has comprehensive automated tests covering all 40+ API endpoints and the critical Fonnte webhook handler. Tests are written using Bun's built-in test runner and provide coverage for happy paths, error cases, and edge conditions.

## Running Tests

**Important**: All test tokens and credentials use the "FIXTURE_" prefix and are dummy values. No real secrets are stored in test files.

### Run All Tests
```bash
bun test
```

### Run Specific Test File
```bash
bun test tests/integration/api/patients.test.ts
```

### Run Tests Matching Pattern
```bash
bun test --grep "Health|patients"
```

### Watch Mode (Auto-rerun on file changes)
```bash
bun test --watch
```

## Test Structure

```
tests/
├── setup.ts                          # Global test configuration
├── helpers/
│   └── request-builder.ts            # HTTP request mocking utilities
├── fixtures/
│   ├── patient.fixtures.ts           # Mock patient data
│   ├── reminder.fixtures.ts          # Mock reminder data
│   ├── template.fixtures.ts          # Mock template data
│   └── user.fixtures.ts              # Mock user and auth data
├── mocks/
│   └── service-mocks.ts              # Service layer mocks
└── integration/
    └── api/
        ├── health.test.ts            # Health check endpoint tests
        ├── user.test.ts              # User profile & auth tests
        ├── patients.test.ts          # Patient management tests (20+ tests)
        ├── reminders.test.ts         # Reminder management tests (17+ tests)
        ├── cms.test.ts               # CMS & content tests (18+ tests)
        ├── admin.test.ts             # Admin operations tests (19+ tests)
        ├── templates.test.ts         # Template management tests
        └── webhooks/
            └── fonnte.test.ts        # Fonnte webhook tests (26+ tests)
```

## Test Coverage

### API Endpoint Tests (129 tests total)

#### Health & Status APIs
- `GET /api/health` - System health check

#### User & Auth APIs
- `GET /api/user/profile` - Retrieve user profile
- `GET /api/user/status` - Get user status
- `GET /api/user/session` - Create session
- `POST /api/auth/update-last-login` - Update login timestamp
- `POST /api/auth/clear-cache` - Clear user cache

#### Patient Management APIs
- `GET /api/patients` - List patients with filters & pagination
- `POST /api/patients` - Create new patient
- `GET /api/patients/:id` - Get patient details
- `PATCH /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Deactivate patient
- `POST /api/patients/:id/send-verification` - Send verification
- `POST /api/patients/:id/manual-verification` - Manual verification
- `POST /api/patients/:id/deactivate` - Deactivate patient
- `POST /api/patients/:id/reactivate` - Reactivate patient
- `GET /api/patients/with-compliance` - Get compliance data
- `GET /api/patients/:id/reminders` - List patient reminders
- `GET /api/patients/:id/reminders/stats` - Reminder statistics
- `GET /api/patients/:id/verification-history` - Verification history
- `GET /api/patients/:id/version` - Patient version info

#### Reminder Management APIs
- `POST /api/reminders` - Create reminder
- `GET /api/reminders/scheduled/:id` - Get scheduled reminder
- `PATCH /api/reminders/scheduled/:id` - Update reminder
- `DELETE /api/reminders/scheduled/:id` - Cancel reminder
- `POST /api/reminders/instant-send-all` - Send to all patients
- `POST /api/patients/:id/reminders/:reminderId/confirm` - Record confirmation

#### CMS & Content APIs
- `GET /api/cms/articles` - List articles
- `POST /api/cms/articles` - Create article
- `GET /api/cms/articles/:id` - Get article
- `PATCH /api/cms/articles/:id` - Update article
- `DELETE /api/cms/articles/:id` - Delete article
- `GET /api/cms/videos` - List videos
- `POST /api/cms/videos` - Create video
- `GET /api/cms/videos/:id` - Get video
- `PATCH /api/cms/videos/:id` - Update video
- `DELETE /api/cms/videos/:id` - Delete video
- `POST /api/cms/content` - Bulk import content
- `POST /api/youtube/fetch` - Import YouTube video

#### Admin APIs
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/users/:userId` - Get user details
- `PATCH /api/admin/users/:userId` - Update user
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/templates` - List templates
- `POST /api/admin/templates` - Create template
- `PATCH /api/admin/templates/:id` - Update template
- `DELETE /api/admin/templates/:id` - Delete template
- `POST /api/admin/templates/seed` - Seed default templates
- `GET /api/admin/verification-analytics` - Analytics
- `POST /api/admin/sync-clerk` - Sync Clerk users
- `POST /api/admin/developer-contact` - Contact developer

#### Template APIs
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template

#### Dashboard APIs
- `GET /api/dashboard/overview` - Dashboard overview

#### Cron APIs
- `POST /api/cron` - Execute cron jobs
- `POST /api/cron/cleanup-conversations` - Cleanup conversations

### Fonnte Webhook Tests (26 tests)

#### Authentication
- ✅ Require webhook secret token
- ✅ Accept valid webhook secret

#### Message Normalization
- ✅ Accept multiple sender field names (sender, phone, from, number, wa_number)
- ✅ Accept multiple message field names (message, text, body)
- ✅ Accept multiple message ID formats (id, message_id, msgId)
- ✅ Accept multiple timestamp formats (timestamp, time, created_at)

#### Verification Processing
- ✅ Process verification responses for PENDING patients
- ✅ Validate verification responses

#### Confirmation Processing
- ✅ Process reminder confirmations for VERIFIED patients

#### Idempotency
- ✅ Detect duplicate messages by ID
- ✅ Use fallback idempotency keys

#### Message Status Tracking
- ✅ Handle status:sent updates
- ✅ Handle status:delivered updates
- ✅ Handle status:failed updates with reasons
- ✅ Map synonymous status values

#### Error Handling
- ✅ Reject missing sender
- ✅ Reject empty messages
- ✅ Handle malformed JSON

#### Patient Matching
- ✅ Ignore messages from unknown phone numbers

#### Rate Limiting
- ✅ Enforce patient response rate limits

#### Health Check
- ✅ GET endpoint returns health status

## Test Utilities

### Request Builder
```typescript
import { buildGetRequest, buildPostRequest, buildPatchRequest, buildDeleteRequest } from "../helpers/request-builder";

// Create a GET request
const req = buildGetRequest("/api/patients", {
  query: { page: "1", limit: "50" },
  token: "auth_token_123"
});

// Create a POST request
const req = buildPostRequest("/api/patients", {
  name: "John Doe",
  phoneNumber: "62812345678"
}, { token: "auth_token_123" });

// Create a webhook request
const req = buildWebhookRequest("/api/webhooks/fonnte/incoming", {
  sender: "62812345678",
  message: "Ya"
});
```

### Test Fixtures
```typescript
import { createMockPatient, createPendingPatient } from "../fixtures/patient.fixtures";
import { createMockReminder, createSentReminder } from "../fixtures/reminder.fixtures";
import { createMockTemplate } from "../fixtures/template.fixtures";
import { createAdminUser, mockAuthToken } from "../fixtures/user.fixtures";

// Use fixtures in tests
const patient = createMockPatient();
const pendingPatient = createPendingPatient();
const reminder = createSentReminder();
```

### Service Mocks
```typescript
import { MockPatientService, MockReminderService } from "../mocks/service-mocks";

const patientService = new MockPatientService();
const reminderService = new MockReminderService();
```

## Test Best Practices

1. **Test Organization**: Tests are organized by API route and feature
2. **Isolation**: Each test is independent and can run in any order
3. **Clear Names**: Test names clearly describe what is being tested
4. **Realistic Data**: Fixtures use realistic patient/reminder/user data
5. **Coverage**: Tests cover success paths, validation, authentication, and error cases
6. **No External Dependencies**: Tests use mocks and don't require running services

## Key Test Scenarios

### Authentication Tests
- Endpoints require authentication tokens where specified
- Requests without tokens are rejected with 401
- Different token types are handled appropriately

### Input Validation Tests
- Required fields are validated
- Invalid formats are rejected
- Partial updates are accepted

### Error Handling Tests
- 404 errors for missing resources
- 400 errors for validation failures
- 401 errors for auth failures
- 403 errors for permission issues

### Webhook Tests
- Multiple payload formats are normalized
- Duplicate messages are detected
- Rate limiting is enforced
- Patient verification status affects processing
- Message status updates are properly mapped

## Extending Tests

### Adding a New Test Suite
1. Create a new file in `tests/integration/api/`
2. Import test utilities and fixtures
3. Write test cases using `describe()` and `it()`
4. Run tests with `bun test`

### Adding Test Fixtures
1. Create a new fixture file in `tests/fixtures/`
2. Export factory functions that create mock data
3. Support overrides for test-specific variations

### Adding Service Mocks
1. Add a new mock class to `tests/mocks/service-mocks.ts`
2. Implement methods matching the real service
3. Support configurable behavior for different test scenarios

## Performance

- **Total Tests**: 129 API tests + 26 webhook tests = 155 tests
- **Execution Time**: ~240ms for full suite
- **No Database**: Tests use mocks, no database required
- **Isolated**: Each test runs independently

## Future Improvements

- [ ] Add visual code coverage reports
- [ ] Implement performance benchmarking tests
- [ ] Add integration tests with mock database
- [ ] Create CI/CD pipeline tests
- [ ] Add load testing scenarios
- [ ] Document E2E test flows
