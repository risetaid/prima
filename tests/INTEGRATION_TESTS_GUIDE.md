# Integration Testing Guide

This document outlines the integration testing strategy for the PRIMA API system.

## Overview

Integration tests verify that different parts of the system work together correctly. Due to database dependencies and authentication requirements, these tests require a test environment setup.

## Test Categories

### 1. Patient Management Flow
Tests the complete lifecycle of patient management:
- Creating a new patient
- Retrieving patient details
- Updating patient information
- Phone number normalization
- Verification status workflow

### 2. Reminder Scheduling Flow
Tests reminder creation and management:
- Creating reminders with different recurrence patterns
- Attaching content (articles/videos) to reminders
- Updating reminder status
- Deleting reminders
- Template-based reminders

### 3. Upload Workflow
Tests file upload functionality:
- Uploading different file types (images, documents)
- File validation (size, type, signature)
- MinIO integration
- Response format consistency

### 4. User Management Flow
Tests user administration:
- User approval workflow
- Role management
- Permission checks
- Status toggling

### 5. CMS Content Flow
Tests content management:
- Creating articles and videos
- Publishing workflow
- Content categorization
- Search and filtering
- Pagination

## Running Integration Tests

Integration tests should be run against a test database with the following setup:

```bash
# Set up test environment
export NODE_ENV=test
export DATABASE_URL=postgresql://...  # Test database

# Run integration tests
bun run test:integration
```

## Test Database Setup

1. Create a separate test database
2. Run migrations
3. Seed with test data
4. Each test should clean up after itself

## Mock Services

For testing purposes, external services should be mocked:
- MinIO (file storage)
- Clerk (authentication)
- WhatsApp API (messaging)
- Redis (caching)

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Reset database state after each test
3. **Fixtures**: Use consistent test data
4. **Idempotency**: Tests should produce same results when run multiple times
5. **Performance**: Keep tests fast by using transactions

## Example Integration Test Structure

```typescript
describe('Patient Creation Flow', () => {
  beforeEach(async () => {
    // Set up test database state
    await cleanupDatabase();
    await seedTestData();
  });

  afterEach(async () => {
    // Clean up after test
    await cleanupDatabase();
  });

  it('should create patient with valid data', async () => {
    // 1. Authenticate as admin user
    const auth = await getTestAuthToken('admin');
    
    // 2. Create patient via API
    const response = await apiClient('/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        name: 'Test Patient',
        phoneNumber: '081234567890',
      }),
    });

    // 3. Verify response
    expect(response.success).toBe(true);
    expect(response.data.phoneNumber).toBe('6281234567890');
    
    // 4. Verify database state
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, response.data.id),
    });
    expect(patient).toBeDefined();
  });
});
```

## Future Enhancements

1. **E2E Tests**: Use Playwright for full browser testing
2. **Load Testing**: Test API performance under load
3. **Contract Testing**: Ensure API contracts are maintained
4. **Snapshot Testing**: Verify response structures don't change unexpectedly

## Test Data Management

Test fixtures should be stored in `tests/fixtures/` directory:
- `patients.json` - Sample patient data
- `reminders.json` - Sample reminder data
- `users.json` - Test user accounts
- `content.json` - Sample articles and videos

## CI/CD Integration

Integration tests should run:
- Before merging pull requests
- After deployment to staging
- On a schedule (nightly) against production-like environment

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is accessible
2. **Authentication**: Mock Clerk auth for tests
3. **File Storage**: Use local MinIO instance for tests
4. **Rate Limiting**: Disable rate limiting in test environment

### Debug Mode

Run tests with verbose output:
```bash
bun run test:integration --reporter=verbose
```

## Coverage Goals

Target coverage for integration tests:
- Critical paths: 100%
- API endpoints: 90%
- Business logic: 85%
- UI workflows: 80%
