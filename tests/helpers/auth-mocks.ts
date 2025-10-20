/**
 * Auth Mocks & Utilities
 */

import { vi } from "vitest";
import type { AuthUser } from "@/lib/auth-utils";

/**
 * Mock auth context for API handlers
 */
export function createMockAuthUser(overrides?: Partial<AuthUser>): AuthUser {
  const now = new Date();
  const defaults = {
    id: "user-001",
    clerkId: "clerk-001",
    email: "test@prima.test",
    firstName: "Test",
    lastName: "User",
    hospitalName: "Test Hospital",
    role: "RELAWAN" as const,
    isApproved: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    approvedAt: now,
    approvedBy: null,
    deletedAt: null,
    canAccessDashboard: true,
    needsApproval: false,
  };

  return {
    ...defaults,
    ...overrides,
  } as AuthUser;
}

/**
 * Mock Clerk auth context
 */
export function createMockClerkAuth(userId?: string) {
  return {
    userId: userId || "clerk-test-001",
    sessionId: "session-test-001",
    session: {
      id: "session-test-001",
      userId: userId || "clerk-test-001",
    },
  };
}

/**
 * Create mock request with auth headers
 */
export function createMockRequestWithAuth(
  user?: Partial<AuthUser>,
  headers?: Record<string, string>
) {
  const authUser = createMockAuthUser(user);

  return {
    headers: new Headers({
      authorization: `Bearer ${Buffer.from(JSON.stringify(authUser)).toString(
        "base64"
      )}`,
      ...headers,
    }),
    user: authUser,
  };
}

/**
 * Mock database methods
 */
export function createMockDatabase() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue({}),
    })),
    execute: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Mock Redis client
 */
export function createMockRedis() {
  const store: Record<string, string | number | boolean> = {};

  return {
    get: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
    set: vi.fn(
      (key: string, value: string | number | boolean, options?: any) => {
        store[key] = value;
        return Promise.resolve("OK");
      }
    ),
    del: vi.fn((key: string) => {
      delete store[key];
      return Promise.resolve(1);
    }),
    exists: vi.fn((key: string) => Promise.resolve(store[key] ? 1 : 0)),
    incr: vi.fn((key: string) => {
      store[key] = (store[key] as number) + 1 || 1;
      return Promise.resolve(store[key]);
    }),
    expire: vi.fn(() => Promise.resolve(1)),
    ttl: vi.fn(() => Promise.resolve(3600)),
    ping: vi.fn(() => Promise.resolve({ success: true })),
    getStatus: vi.fn(() => ({
      circuitBreaker: { isOpen: false, isHalfOpen: false, failureCount: 0 },
    })),
  };
}

/**
 * Mock logger
 */
export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Mock Fonnte API client
 */
export function createMockFontneClient() {
  return {
    sendMessage: vi.fn(async (phone: string, message: string) => ({
      success: true,
      data: {
        id: `fonnte-${Date.now()}`,
        to: phone,
        message,
      },
    })),
    getDevice: vi.fn(async () => ({
      device: "whatsapp",
      name: "Test Device",
      status: "active",
    })),
  };
}

/**
 * Mock Clerk client
 */
export function createMockClerkClient() {
  return {
    users: {
      getUser: vi.fn(async (userId: string) => ({
        id: userId,
        emailAddresses: [{ emailAddress: "test@prima.test" }],
        firstName: "Test",
        lastName: "User",
      })),
      createUser: vi.fn(async (data: any) => ({
        id: `clerk-${Date.now()}`,
        ...data,
      })),
    },
  };
}

/**
 * Reset all mocks
 */
export function resetAuthMocks() {
  vi.clearAllMocks();
}
