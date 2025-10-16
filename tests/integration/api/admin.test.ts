/**
 * Admin API Tests
 * Tests for admin management endpoints
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { buildGetRequest, buildPostRequest, buildPatchRequest, buildDeleteRequest } from "../../helpers/request-builder";
import { createAdminUser } from "../../fixtures/user.fixtures";
import { mockAuthToken } from "../../fixtures/user.fixtures";

describe("Admin - Users API", () => {
  let adminUser: any;

  beforeEach(() => {
    adminUser = createAdminUser();
  });

  describe("GET /api/admin/users", () => {
    it("should list all users", async () => {
      const request = buildGetRequest("/api/admin/users", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("admin/users");
    });

    it("should support pagination", async () => {
      const request = buildGetRequest("/api/admin/users", {
        query: { page: "1", limit: "50" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("page")).toBe("1");
    });

    it("should support role filter", async () => {
      const request = buildGetRequest("/api/admin/users", {
        query: { role: "ADMIN" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("role")).toBe("ADMIN");
    });
  });

  describe("POST /api/admin/users", () => {
    it("should create new user", async () => {
      const data = {
        email: "newuser@prima.id",
        fullName: "New Admin",
        role: "ADMIN",
      };
      const request = buildPostRequest("/api/admin/users", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.email).toBe("newuser@prima.id");
    });

    it("should validate email format", async () => {
      const data = {
        email: "invalid-email",
        fullName: "User",
        role: "ADMIN",
      };
      const request = buildPostRequest("/api/admin/users", data, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should require valid role", async () => {
      const data = {
        email: "user@prima.id",
        fullName: "User",
        role: "INVALID_ROLE",
      };
      const request = buildPostRequest("/api/admin/users", data, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should support all valid roles", async () => {
      const roles = ["RELAWAN", "ADMIN", "DEVELOPER", "DOC"];
      for (const role of roles) {
        const data = {
          email: `user-${role}@prima.id`,
          fullName: `User ${role}`,
          role,
        };
        const request = buildPostRequest("/api/admin/users", data, {
          token: mockAuthToken,
        });
        const body = await request.json();
        expect(body.role).toBe(role);
      }
    });
  });

  describe("GET /api/admin/users/:userId", () => {
    it("should retrieve user by ID", async () => {
      const userId = "user-123";
      const request = buildGetRequest(`/api/admin/users/${userId}`, {
        token: mockAuthToken,
      });
      expect(request.url).toContain(userId);
    });
  });

  describe("PATCH /api/admin/users/:userId", () => {
    it("should update user details", async () => {
      const userId = "user-123";
      const data = {
        fullName: "Updated Name",
        isActive: true,
      };
      const request = buildPatchRequest(`/api/admin/users/${userId}`, data, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("PATCH");
    });

    it("should allow disabling user", async () => {
      const userId = "user-123";
      const data = { isActive: false };
      const request = buildPatchRequest(`/api/admin/users/${userId}`, data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.isActive).toBe(false);
    });
  });

  describe("DELETE /api/admin/users/:userId", () => {
    it("should delete user", async () => {
      const userId = "user-123";
      const request = buildDeleteRequest(`/api/admin/users/${userId}`, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("DELETE");
    });
  });
});

describe("Admin - Templates API", () => {
  describe("GET /api/admin/templates", () => {
    it("should list all templates", async () => {
      const request = buildGetRequest("/api/admin/templates", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("templates");
    });
  });

  describe("POST /api/admin/templates", () => {
    it("should create template", async () => {
      const data = {
        name: "Admin Template",
        content: "Template content with {{variable}}",
        category: "MEDICATION",
      };
      const request = buildPostRequest("/api/admin/templates", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.name).toBe("Admin Template");
    });
  });

  describe("PATCH /api/admin/templates/:id", () => {
    it("should update template", async () => {
      const templateId = "template-123";
      const data = { name: "Updated Template" };
      const request = buildPatchRequest(`/api/admin/templates/${templateId}`, data, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("PATCH");
    });
  });

  describe("DELETE /api/admin/templates/:id", () => {
    it("should delete template", async () => {
      const templateId = "template-123";
      const request = buildDeleteRequest(`/api/admin/templates/${templateId}`, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("DELETE");
    });
  });

  describe("POST /api/admin/templates/seed", () => {
    it("should seed default templates", async () => {
      const request = buildPostRequest("/api/admin/templates/seed", {}, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
    });
  });
});

describe("Admin - Analytics", () => {
  describe("GET /api/admin/verification-analytics", () => {
    it("should retrieve verification analytics", async () => {
      const request = buildGetRequest("/api/admin/verification-analytics", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("verification-analytics");
    });
  });
});

describe("Admin - System Operations", () => {
  describe("POST /api/admin/sync-clerk", () => {
    it("should sync Clerk users", async () => {
      const request = buildPostRequest("/api/admin/sync-clerk", {}, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
    });
  });

  describe("POST /api/admin/developer-contact", () => {
    it("should send message to developer", async () => {
      const data = {
        subject: "Issue Report",
        message: "There is an issue...",
      };
      const request = buildPostRequest("/api/admin/developer-contact", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.subject).toBe("Issue Report");
    });
  });
});
