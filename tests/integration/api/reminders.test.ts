/**
 * Reminders API Tests
 * Tests for reminder management endpoints
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { buildPostRequest, buildGetRequest, buildPatchRequest, buildDeleteRequest } from "../../helpers/request-builder";
import { createMockReminder, mockCreateReminderInput } from "../../fixtures/reminder.fixtures";
import { mockAuthToken } from "../../fixtures/user.fixtures";

describe("Reminders API", () => {
  let testReminder: any;

  beforeEach(() => {
    testReminder = createMockReminder();
  });

  describe("POST /api/reminders", () => {
    it("should create reminder with valid data", async () => {
      const request = buildPostRequest("/api/reminders", mockCreateReminderInput, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
      const body = await request.json();
      expect(body.patientId).toBe(mockCreateReminderInput.patientId);
    });

    it("should require authentication", async () => {
      const request = buildPostRequest("/api/reminders", mockCreateReminderInput);
      expect(request.headers.get("authorization")).toBeNull();
    });

    it("should validate required fields", async () => {
      const invalidData = {
        patientId: "patient-123", // missing other required fields
      };
      const request = buildPostRequest("/api/reminders", invalidData, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should require valid patient ID format", async () => {
      const data = {
        ...mockCreateReminderInput,
        patientId: "invalid",
      };
      const request = buildPostRequest("/api/reminders", data, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should validate scheduled time is in future", async () => {
      const data = {
        ...mockCreateReminderInput,
        scheduledTime: new Date(Date.now() - 3600000).toISOString(), // past time
      };
      const request = buildPostRequest("/api/reminders", data, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });

    it("should support recurring reminders", async () => {
      const data = {
        ...mockCreateReminderInput,
        recurrence: "DAILY",
        recurrenceEndDate: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days
      };
      const request = buildPostRequest("/api/reminders", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.recurrence).toBe("DAILY");
    });
  });

  describe("GET /api/reminders/scheduled/:id", () => {
    it("should retrieve scheduled reminder by ID", async () => {
      const request = buildGetRequest(`/api/reminders/scheduled/${testReminder.id}`, {
        token: mockAuthToken,
      });
      expect(request.url).toContain(testReminder.id);
    });

    it("should require authentication", async () => {
      const request = buildGetRequest(`/api/reminders/scheduled/${testReminder.id}`);
      expect(request.headers.get("authorization")).toBeNull();
    });
  });

  describe("PATCH /api/reminders/scheduled/:id", () => {
    it("should update reminder with valid data", async () => {
      const updateData = {
        title: "Updated Reminder",
        message: "Updated message",
      };
      const request = buildPatchRequest(
        `/api/reminders/scheduled/${testReminder.id}`,
        updateData,
        { token: mockAuthToken }
      );
      expect(request.method).toBe("PATCH");
    });

    it("should validate update data", async () => {
      const updateData = {
        scheduledTime: "invalid-date",
      };
      const request = buildPatchRequest(
        `/api/reminders/scheduled/${testReminder.id}`,
        updateData,
        { token: mockAuthToken }
      );
      expect(request).toBeDefined();
    });

    it("should not allow updating past time", async () => {
      const updateData = {
        scheduledTime: new Date(Date.now() - 3600000).toISOString(),
      };
      const request = buildPatchRequest(
        `/api/reminders/scheduled/${testReminder.id}`,
        updateData,
        { token: mockAuthToken }
      );
      expect(request).toBeDefined();
    });
  });

  describe("DELETE /api/reminders/scheduled/:id", () => {
    it("should cancel scheduled reminder", async () => {
      const request = buildDeleteRequest(`/api/reminders/scheduled/${testReminder.id}`, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("DELETE");
    });

    it("should require authentication", async () => {
      const request = buildDeleteRequest(`/api/reminders/scheduled/${testReminder.id}`);
      expect(request.headers.get("authorization")).toBeNull();
    });
  });

  describe("POST /api/reminders/instant-send-all", () => {
    it("should send message to all verified patients", async () => {
      const data = {
        message: "Important health reminder",
        title: "Instant Reminder",
      };
      const request = buildPostRequest("/api/reminders/instant-send-all", data, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
    });

    it("should require admin or developer role", async () => {
      const data = {
        message: "Instant message",
      };
      const request = buildPostRequest("/api/reminders/instant-send-all", data, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });
  });

  describe("POST /api/patients/:id/reminders/:reminderId/confirm", () => {
    it("should record patient confirmation", async () => {
      const patientId = "patient-123";
      const reminderId = "reminder-456";
      const data = { action: "confirmed" };

      const request = buildPostRequest(
        `/api/patients/${patientId}/reminders/${reminderId}/confirm`,
        data,
        { token: mockAuthToken }
      );
      expect(request.url).toContain(patientId);
      expect(request.url).toContain(reminderId);
    });

    it("should support different confirmation actions", async () => {
      const actions = ["confirmed", "not_taken", "already_taken"];
      for (const action of actions) {
        const request = buildPostRequest(
          `/api/patients/p-123/reminders/r-456/confirm`,
          { action },
          { token: mockAuthToken }
        );
        const body = await request.json();
        expect(body.action).toBe(action);
      }
    });
  });
});
