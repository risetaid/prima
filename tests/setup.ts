/**
 * Vitest Setup File
 * 
 * This file runs before all tests to set up the testing environment.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set up environment variables for testing
beforeAll(() => {
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  
  // Mock logger to prevent console output during tests
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
  
  // You can add global test setup here
});

afterAll(() => {
  // Clean up after all tests
});

afterEach(() => {
  // Clean up after each test
});
