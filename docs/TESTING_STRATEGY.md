# PRIMA Testing Strategy Documentation

## Overview

This document outlines the comprehensive testing strategy for the PRIMA healthcare management system, ensuring reliability, maintainability, and quality of the codebase.

## Testing Architecture

### Test Categories

#### 1. Unit Tests
- **Purpose**: Test individual functions and components in isolation
- **Coverage**: Business logic, utilities, and pure functions
- **Tools**: Jest, React Testing Library
- **Location**: `src/__tests__/` directory

#### 2. Integration Tests
- **Purpose**: Test interactions between components and services
- **Coverage**: API endpoints, database operations, and component interactions
- **Tools**: Jest, Supertest for API testing
- **Location**: `src/__tests__/integration/` directory

#### 3. End-to-End Tests
- **Purpose**: Test complete user workflows
- **Coverage**: Critical user journeys and business processes
- **Tools**: Playwright or Cypress
- **Location**: `e2e/` directory

#### 4. Performance Tests
- **Purpose**: Ensure system performance meets requirements
- **Coverage**: Load testing, response times, and resource usage
- **Tools**: k6 or Artillery
- **Location**: `performance/` directory

## Test Setup

### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
}
```

### Test Setup File

```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Global test utilities
global.testUtils = {
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  createMockFn: (implementation) => jest.fn(implementation),
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),
}
```

## Critical Test Cases

### 1. Compliance Service Tests

```typescript
// src/__tests__/compliance-service.test.ts
describe('ComplianceService', () => {
  describe('calculatePatientCompliance', () => {
    it('should calculate compliance correctly', async () => {
      // Test successful compliance calculation
    })

    it('should handle zero delivered reminders', async () => {
      // Test edge case with no reminders
    })

    it('should handle database errors gracefully', async () => {
      // Test error handling
    })
  })

  describe('getPatientComplianceStats', () => {
    it('should return detailed compliance statistics', async () => {
      // Test comprehensive stats calculation
    })
  })
})
```

### 2. Rate Limiter Tests

```typescript
// src/__tests__/rate-limiter.test.ts
describe('RateLimiter', () => {
  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      // Test normal operation
    })

    it('should block requests over limit', async () => {
      // Test rate limiting
    })

    it('should clean old requests outside window', async () => {
      // Test cleanup logic
    })
  })

  describe('rateLimitMiddleware', () => {
    it('should return success response for allowed requests', async () => {
      // Test middleware success
    })

    it('should return rate limit response for blocked requests', async () => {
      // Test middleware blocking
    })
  })
})
```

### 3. Authentication Tests

```typescript
// src/__tests__/auth-utils.test.ts
describe('Authentication Utilities', () => {
  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      // Test successful authentication
    })

    it('should return null when not authenticated', async () => {
      // Test unauthenticated state
    })

    it('should handle Clerk API errors', async () => {
      // Test error handling
    })
  })

  describe('requireAuth', () => {
    it('should redirect when not authenticated', async () => {
      // Test redirect behavior
    })

    it('should return user when authenticated', async () => {
      // Test successful auth
    })
  })
})
```

### 4. API Route Tests

```typescript
// src/__tests__/api/patients.test.ts
describe('Patient API Routes', () => {
  describe('GET /api/patients/[id]', () => {
    it('should return patient data with compliance', async () => {
      // Test successful patient fetch
    })

    it('should handle rate limiting', async () => {
      // Test rate limit enforcement
    })

    it('should return 404 for non-existent patient', async () => {
      // Test error handling
    })
  })

  describe('PUT /api/patients/[id]', () => {
    it('should update patient successfully', async () => {
      // Test successful update
    })

    it('should validate input data', async () => {
      // Test input validation
    })
  })
})
```

### 5. Component Tests

```typescript
// src/__tests__/components/PatientCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PatientCard } from '@/components/PatientCard'

describe('PatientCard', () => {
  it('should display patient information', () => {
    const patient = {
      id: '1',
      name: 'John Doe',
      complianceRate: 85
    }

    render(<PatientCard patient={patient} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('should handle loading state', () => {
    render(<PatientCard patient={null} loading={true} />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should handle error state', () => {
    const onRetry = jest.fn()
    render(<PatientCard error="Failed to load" onRetry={onRetry} />)

    expect(screen.getByText('Failed to load')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Retry'))
    expect(onRetry).toHaveBeenCalled()
  })
})
```

## Test Data Management

### Test Database Setup

```typescript
// src/__tests__/setup/test-db.ts
import { db } from '@/db'
import { users, patients, reminderLogs } from '@/db/schema'

export async function setupTestData() {
  // Create test users
  const testUser = await db.insert(users).values({
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'MEMBER',
    isApproved: true,
    clerkId: 'test-clerk-id'
  }).returning()

  // Create test patients
  const testPatient = await db.insert(patients).values({
    name: 'Test Patient',
    phoneNumber: '+6281234567890',
    assignedVolunteerId: testUser[0].id
  }).returning()

  return { testUser: testUser[0], testPatient: testPatient[0] }
}

export async function cleanupTestData() {
  await db.delete(reminderLogs)
  await db.delete(patients)
  await db.delete(users)
}
```

### Mock Data Factories

```typescript
// src/__tests__/factories/patient.factory.ts
export function createMockPatient(overrides = {}) {
  return {
    id: 'test-patient-id',
    name: 'Test Patient',
    phoneNumber: '+6281234567890',
    complianceRate: 85,
    assignedVolunteer: {
      id: 'test-volunteer-id',
      firstName: 'Test',
      lastName: 'Volunteer'
    },
    ...overrides
  }
}

export function createMockReminder(overrides = {}) {
  return {
    id: 'test-reminder-id',
    medicationName: 'Test Medication',
    dosage: '10mg',
    scheduledTime: '08:00',
    status: 'DELIVERED',
    ...overrides
  }
}
```

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test compliance-service.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 85%
- **Lines**: 80%

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/types/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 80,
    },
  },
}
```

## Performance Testing

### Load Testing

```javascript
// performance/load-test.js
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
}

export default function () {
  const response = http.get('http://localhost:3000/api/patients')
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

### Memory Leak Testing

```typescript
// src/__tests__/memory-leak.test.ts
describe('Memory Leak Tests', () => {
  it('should not have memory leaks in useAsyncData hook', () => {
    // Test for proper cleanup
  })

  it('should clean up polling intervals', () => {
    // Test polling cleanup
  })
})
```

## Test Organization

### Directory Structure

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── compliance-service.test.ts
│   │   ├── rate-limiter.test.ts
│   │   └── auth-utils.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── patients.test.ts
│   │   │   └── reminders.test.ts
│   │   └── components/
│   │       └── PatientDashboard.test.tsx
│   ├── e2e/
│   │   ├── patient-management.spec.ts
│   │   └── compliance-tracking.spec.ts
│   ├── factories/
│   │   ├── patient.factory.ts
│   │   └── reminder.factory.ts
│   ├── setup/
│   │   ├── test-db.ts
│   │   └── mock-data.ts
│   └── utils/
│       └── test-helpers.ts
```

## Best Practices

### Test Writing Guidelines

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert Pattern**: Structure tests clearly
3. **Independent Tests**: Each test should be independent
4. **Mock External Dependencies**: Mock databases, APIs, and external services
5. **Test Edge Cases**: Include tests for error conditions and edge cases

### Code Coverage Best Practices

1. **Focus on Critical Paths**: Prioritize testing of critical business logic
2. **Avoid Testing Implementation Details**: Test behavior, not implementation
3. **Use Coverage Reports**: Regularly review coverage reports
4. **Maintain Coverage Thresholds**: Ensure minimum coverage requirements are met

### Performance Testing Guidelines

1. **Realistic Load Patterns**: Use realistic user behavior patterns
2. **Monitor Resource Usage**: Track memory, CPU, and database usage
3. **Gradual Load Increase**: Start with low load and gradually increase
4. **Continuous Monitoring**: Monitor performance in production

## Maintenance

### Test Maintenance Tasks

- **Regular Test Execution**: Run tests regularly in CI/CD
- **Update Test Data**: Keep test data current with schema changes
- **Review Test Coverage**: Regularly review and improve coverage
- **Performance Monitoring**: Monitor test execution times
- **Flaky Test Management**: Identify and fix flaky tests

### Documentation Updates

- **Keep Tests Current**: Update tests when code changes
- **Document Test Cases**: Document complex test scenarios
- **Update Test Strategy**: Review and update testing strategy regularly
- **Share Best Practices**: Share testing knowledge across team

---

*This testing strategy ensures the PRIMA system maintains high quality, reliability, and performance through comprehensive automated testing.*