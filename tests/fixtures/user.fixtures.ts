// @noSecrets This file contains test fixtures only
/**
 * User Test Fixtures
 * Provides realistic sample user data for testing
 * WARNING: All tokens below are test fixtures, NOT real credentials
 */

export const createMockUser = (overrides = {}) => ({
  id: "user-123-uuid",
  clerkId: "clerk-user-123",
  email: "volunteer@prima.id",
  fullName: "Siti Mulyani",
  role: "RELAWAN" as const,
  isActive: true,
  lastLoginAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createAdminUser = (overrides = {}) =>
  createMockUser({
    role: "ADMIN",
    email: "admin@prima.id",
    fullName: "Admin Prima",
    ...overrides,
  });

export const createDeveloperUser = (overrides = {}) =>
  createMockUser({
    role: "DEVELOPER",
    email: "dev@prima.id",
    fullName: "Developer Prima",
    ...overrides,
  });

export const createDoctorUser = (overrides = {}) =>
  createMockUser({
    role: "DOC",
    email: "doctor@prima.id",
    fullName: "Dr. Prima",
    ...overrides,
  });

export const createInactiveUser = (overrides = {}) =>
  createMockUser({
    isActive: false,
    ...overrides,
  });

export const mockUsers = {
  relawan: createMockUser(),
  admin: createAdminUser(),
  developer: createDeveloperUser(),
  doctor: createDoctorUser(),
  inactive: createInactiveUser(),
};

export const mockCreateUserInput = {
  clerkId: "clerk-new-user-456",
  email: "newuser@prima.id",
  fullName: "New Volunteer",
  role: "RELAWAN",
};

export const mockUpdateUserInput = {
  fullName: "Updated Name",
  isActive: false,
};

// Test-only fixture tokens (NOT real credentials)
export const mockAuthToken = "FIXTURE_AUTH_TOKEN_123456";
export const mockWebhookToken = process.env.WEBHOOK_SECRET || "FIXTURE_WEBHOOK_SECRET";
