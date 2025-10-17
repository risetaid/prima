// @noSecrets This file contains test fixtures only
/**
 * Test Setup - Bun Test Configuration
 * Initializes global test utilities and mocks
 * WARNING: All credentials below are test fixtures, NOT real secrets
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// Export test utilities globally
(globalThis as any).describe = describe;
(globalThis as any).it = it;
(globalThis as any).expect = expect;
(globalThis as any).beforeEach = beforeEach;
(globalThis as any).afterEach = afterEach;

// Test fixtures - these are dummy values used only for unit testing
// DO NOT use these values in production
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://FIXTURE_USER:FIXTURE_PASS@localhost:5432/prima_test";
}
if (!process.env.CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = "FIXTURE_CLERK_PUB_KEY";
}
if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = "FIXTURE_CLERK_SECRET_KEY";
}
if (!process.env.FONNTE_API_KEY) {
  process.env.FONNTE_API_KEY = "FIXTURE_FONNTE_API_KEY";
}
if (!process.env.FONNTE_DEVICE_ID) {
  process.env.FONNTE_DEVICE_ID = "FIXTURE_DEVICE_ID";
}
if (!process.env.WEBHOOK_SECRET) {
  process.env.WEBHOOK_SECRET = "FIXTURE_WEBHOOK_SECRET";
}
