/**
 * Vitest Test Setup
 *
 * This file is run before all tests to set up the test environment.
 */

// Mock environment variables for tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.env as any).NODE_ENV = 'test'

// Mock REDIS_URL to be undefined by default (tests should mock Redis if needed)
delete process.env.REDIS_URL
delete process.env.KV_URL

// Suppress noisy logs during tests
process.env.LOG_LEVEL = 'error'
