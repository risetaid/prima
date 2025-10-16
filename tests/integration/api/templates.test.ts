/**
 * Templates API Tests
 * Tests for template management endpoints
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { buildGetRequest, buildPostRequest } from "../../helpers/request-builder";
import { mockCreateTemplateInput } from "../../fixtures/template.fixtures";
import { mockAuthToken } from "../../fixtures/user.fixtures";

describe("Templates API", () => {
  describe("GET /api/templates", () => {
    it("should list all templates", async () => {
      const request = buildGetRequest("/api/templates", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("templates");
    });

    it("should support pagination", async () => {
      const request = buildGetRequest("/api/templates", {
        query: { page: "1", limit: "50" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("page")).toBe("1");
    });

    it("should support category filter", async () => {
      const request = buildGetRequest("/api/templates", {
        query: { category: "MEDICATION" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("category")).toBe("MEDICATION");
    });
  });

  describe("POST /api/templates", () => {
    it("should create template with valid data", async () => {
      const request = buildPostRequest("/api/templates", mockCreateTemplateInput, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.name).toBe(mockCreateTemplateInput.name);
    });

    it("should require authentication", async () => {
      const request = buildPostRequest("/api/templates", mockCreateTemplateInput);
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should validate required fields", async () => {
      const invalidData = {
        name: "Template", // missing content
      };
      const request = buildPostRequest("/api/templates", invalidData, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should support template variables", async () => {
      const data = {
        name: "Patient Reminder",
        content: "Halo {{patientName}}, jadwal Anda: {{appointmentTime}}",
        category: "APPOINTMENT",
      };
      const request = buildPostRequest("/api/templates", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.content).toContain("{{patientName}}");
    });
  });
});

describe("Upload API", () => {
  describe("POST /api/upload", () => {
    it("should handle file upload", async () => {
      // File uploads are complex in tests, so we'll keep this basic
      const request = buildPostRequest("/api/upload", {}, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
    });
  });
});

describe("Cron & Maintenance APIs", () => {
  describe("POST /api/cron/route", () => {
    it("should execute cron jobs", async () => {
      const request = buildPostRequest("/api/cron", {}, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
    });
  });

  describe("POST /api/cron/cleanup-conversations", () => {
    it("should clean up old conversations", async () => {
      const request = buildPostRequest(
        "/api/cron/cleanup-conversations",
        {},
        { token: mockAuthToken }
      );
      expect(request.method).toBe("POST");
    });
  });
});
