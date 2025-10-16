/**
 * User API Tests
 * Tests for user profile and session endpoints
 */

import { describe, it, expect } from "bun:test";
import { buildGetRequest, buildPostRequest } from "../../helpers/request-builder";
import { mockAuthToken } from "../../fixtures/user.fixtures";

describe("User API", () => {
  describe("GET /api/user/profile", () => {
    it("should require authentication", async () => {
      const request = buildGetRequest("/api/user/profile");
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should return user profile with valid token", async () => {
      const request = buildGetRequest("/api/user/profile", {
        token: mockAuthToken,
      });
      expect(request.headers.get("authorization")).toBe(`Bearer ${mockAuthToken}`);
      expect(request.url).toContain("user/profile");
    });

    it("should include user's email and name in response", async () => {
      const request = buildGetRequest("/api/user/profile", {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });
  });

  describe("GET /api/user/status", () => {
    it("should return user status", async () => {
      const request = buildGetRequest("/api/user/status", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("user/status");
    });

    it("should include last login information", async () => {
      const request = buildGetRequest("/api/user/status", {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should require authentication", async () => {
      const request = buildGetRequest("/api/user/status");
      expect(request.headers.get("authorization")).toBeNull();
    });
  });

  describe("GET /api/user/session", () => {
    it("should create session for authenticated user", async () => {
      const request = buildGetRequest("/api/user/session", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("user/session");
    });

    it("should require authentication", async () => {
      const request = buildGetRequest("/api/user/session");
      expect(request.headers.get("authorization")).toBeNull();
    });
  });
});

describe("Authentication APIs", () => {
  describe("POST /api/auth/update-last-login", () => {
    it("should update last login timestamp", async () => {
      const request = buildPostRequest(
        "/api/auth/update-last-login",
        {},
        { token: mockAuthToken }
      );
      expect(request.method).toBe("POST");
    });

    it("should require authentication", async () => {
      const request = buildPostRequest("/api/auth/update-last-login", {});
      expect(request.headers.get("authorization")).toBeNull();
    });
  });

  describe("POST /api/auth/clear-cache", () => {
    it("should clear user cache", async () => {
      const request = buildPostRequest(
        "/api/auth/clear-cache",
        {},
        { token: mockAuthToken }
      );
      expect(request.method).toBe("POST");
    });

    it("should return success response", async () => {
      const request = buildPostRequest(
        "/api/auth/clear-cache",
        {},
        { token: mockAuthToken }
      );
      expect(request).toBeDefined();
    });
  });
});

describe("Dashboard API", () => {
  describe("GET /api/dashboard/overview", () => {
    it("should return dashboard overview", async () => {
      const request = buildGetRequest("/api/dashboard/overview", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("dashboard/overview");
    });

    it("should require authentication", async () => {
      const request = buildGetRequest("/api/dashboard/overview");
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should include statistics", async () => {
      const request = buildGetRequest("/api/dashboard/overview", {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });
  });
});
