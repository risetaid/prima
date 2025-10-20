/**
 * Test Setup & Global Configuration
 * Initializes test environment, mocks, and fixtures
 */

import { beforeEach, afterEach, vi } from "vitest";
import { loadEnvFile } from "process";

// Load .env.test or .env.local for tests
try {
  loadEnvFile(".env.local");
} catch {
  // .env.local may not exist in CI
}

// Mock Next.js Headers
global.Headers = class Headers {
  private map: Map<string, string> = new Map();

  constructor(init?: Record<string, string>) {
    if (init) {
      Object.entries(init).forEach(([k, v]) =>
        this.map.set(k.toLowerCase(), v)
      );
    }
  }

  get(name: string) {
    return this.map.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string) {
    this.map.set(name.toLowerCase(), value);
  }

  has(name: string) {
    return this.map.has(name.toLowerCase());
  }

  entries() {
    return this.map.entries();
  }
} as any;

// Mock crypto.randomUUID for consistent testing
let uuidCounter = 0;
global.crypto = {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
} as any;

// Reset UUID counter between tests
beforeEach(() => {
  uuidCounter = 0;
});

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Suppress console output in tests unless explicitly needed
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.debug = vi.fn();
  console.info = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});
