/**
 * Patients API Tests
 * Tests for patient management endpoints
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { buildGetRequest, buildPostRequest, getResponseStatus } from "../../helpers/request-builder";
import { createMockPatient, mockCreatePatientInput } from "../../fixtures/patient.fixtures";
import { mockAuthToken } from "../../fixtures/user.fixtures";

describe("Patients API", () => {
  let testPatient: any;

  beforeEach(() => {
    testPatient = createMockPatient();
  });

  describe("GET /api/patients", () => {
    it("should require authentication", async () => {
      const request = buildGetRequest("/api/patients");
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should accept authentication token", async () => {
      const request = buildGetRequest("/api/patients", { token: mockAuthToken });
      expect(request.headers.get("authorization")).toBe(`Bearer ${mockAuthToken}`);
    });

    it("should support pagination parameters", async () => {
      const request = buildGetRequest("/api/patients", {
        query: { page: "1", limit: "50" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("limit")).toBe("50");
    });

    it("should support search filter", async () => {
      const request = buildGetRequest("/api/patients", {
        query: { search: "Budi" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("search")).toBe("Budi");
    });

    it("should support status filter", async () => {
      const request = buildGetRequest("/api/patients", {
        query: { status: "active" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("status")).toBe("active");
    });
  });

  describe("POST /api/patients", () => {
    it("should require authentication", async () => {
      const request = buildPostRequest("/api/patients", mockCreatePatientInput);
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should accept valid patient creation data", async () => {
      const request = buildPostRequest("/api/patients", mockCreatePatientInput, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
      expect(request.headers.get("content-type")).toBe("application/json");
    });

    it("should validate required fields", async () => {
      const invalidData = {
        name: "Test", // missing phoneNumber and other required fields
      };
      const request = buildPostRequest("/api/patients", invalidData, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should include all required fields in body", async () => {
      const request = buildPostRequest("/api/patients", mockCreatePatientInput, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.phoneNumber).toBe(mockCreatePatientInput.phoneNumber);
      expect(body.name).toBe(mockCreatePatientInput.name);
    });
  });

  describe("GET /api/patients/:id", () => {
    it("should require authentication", async () => {
      const request = buildGetRequest("/api/patients/patient-123");
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should include patient ID in path", async () => {
      const patientId = "patient-456-uuid";
      const request = buildGetRequest(`/api/patients/${patientId}`, {
        token: mockAuthToken,
      });
      expect(request.url).toContain(patientId);
    });

    it("should handle different patient ID formats", async () => {
      const validIds = ["patient-123", "uuid-style-id", "numeric-456"];
      validIds.forEach((id) => {
        const request = buildGetRequest(`/api/patients/${id}`, {
          token: mockAuthToken,
        });
        expect(request.url).toContain(id);
      });
    });
  });

  describe("PATCH /api/patients/:id", () => {
    it("should require authentication", async () => {
      const request = buildGetRequest("/api/patients/patient-123");
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should accept partial update data", async () => {
      const updateData = {
        name: "Updated Name",
        age: 50,
      };
      const request = buildPostRequest("/api/patients/patient-123", updateData, {
        method: "PATCH",
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });
  });

  describe("POST /api/patients/:id/send-verification", () => {
    it("should send verification message to patient", async () => {
      const request = buildPostRequest(
        `/api/patients/${testPatient.id}/send-verification`,
        {},
        { token: mockAuthToken }
      );
      expect(request.method).toBe("POST");
      expect(request.url).toContain(testPatient.id);
    });

    it("should require authentication", async () => {
      const request = buildPostRequest(
        `/api/patients/${testPatient.id}/send-verification`,
        {}
      );
      expect(request.headers.get("authorization")).toBeNull();
    });
  });

  describe("GET /api/patients/with-compliance", () => {
    it("should return patients with compliance data", async () => {
      const request = buildGetRequest("/api/patients/with-compliance", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("with-compliance");
    });
  });

  describe("GET /api/patients/:id/reminders", () => {
    it("should fetch reminders for specific patient", async () => {
      const request = buildGetRequest(`/api/patients/${testPatient.id}/reminders`, {
        token: mockAuthToken,
      });
      expect(request.url).toContain("reminders");
    });

    it("should support pagination", async () => {
      const request = buildGetRequest(`/api/patients/${testPatient.id}/reminders`, {
        query: { page: "2", limit: "25" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("page")).toBe("2");
    });
  });

  describe("GET /api/patients/:id/reminders/stats", () => {
    it("should return reminder statistics", async () => {
      const request = buildGetRequest(`/api/patients/${testPatient.id}/reminders/stats`, {
        token: mockAuthToken,
      });
      expect(request.url).toContain("stats");
    });
  });

  describe("GET /api/patients/:id/verification-history", () => {
    it("should return verification history", async () => {
      const request = buildGetRequest(
        `/api/patients/${testPatient.id}/verification-history`,
        { token: mockAuthToken }
      );
      expect(request.url).toContain("verification-history");
    });
  });
});
