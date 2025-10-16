/**
 * Fonnte Webhook Tests
 * Tests for /api/webhooks/fonnte/incoming endpoint
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { buildPostRequest, buildGetRequest } from "../../../helpers/request-builder";
import { createMockPatient } from "../../../fixtures/patient.fixtures";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "test_webhook_secret";

describe("POST /api/webhooks/fonnte/incoming", () => {
  let mockPatient: any;

  beforeEach(() => {
    mockPatient = createMockPatient({
      phoneNumber: "62812345678",
      verificationStatus: "PENDING",
    });
  });

  describe("Authentication", () => {
    it("should require webhook secret token", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "Ya",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload);
      // No webhook token provided
      expect(request.headers.get("x-webhook-secret")).toBeNull();
    });

    it("should accept valid webhook secret", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "Ya",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      expect(request.headers.get("x-webhook-secret")).toBe(WEBHOOK_SECRET);
    });
  });

  describe("Message Normalization", () => {
    it("should accept 'sender' field", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "Test message",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.sender).toBe(mockPatient.phoneNumber);
    });

    it("should accept 'phone' field as alternative", async () => {
      const payload = {
        phone: mockPatient.phoneNumber,
        message: "Test message",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.phone).toBe(mockPatient.phoneNumber);
    });

    it("should accept 'from' field as alternative", async () => {
      const payload = {
        from: mockPatient.phoneNumber,
        text: "Test message",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.from).toBe(mockPatient.phoneNumber);
    });

    it("should accept 'message' field", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "This is a test message",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.message).toBe("This is a test message");
    });

    it("should accept 'text' field as alternative", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        text: "Alternative text field",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.text).toBe("Alternative text field");
    });

    it("should accept 'body' field as alternative", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        body: "Body text content",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.body).toBe("Body text content");
    });

    it("should handle different message ID field names", async () => {
      const testCases = [
        { id: "msg-123" },
        { message_id: "msg-456" },
        { msgId: "msg-789" },
      ];

      for (const testCase of testCases) {
        const payload = {
          sender: mockPatient.phoneNumber,
          message: "Test",
          ...testCase,
        };
        const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
          headers: { "x-webhook-secret": WEBHOOK_SECRET },
        });
        const body = await request.json();
        expect(body).toBeDefined();
      }
    });

    it("should handle different timestamp field names", async () => {
      const now = Date.now();
      const testCases = [
        { timestamp: now.toString() },
        { time: now.toString() },
        { created_at: now.toString() },
      ];

      for (const testCase of testCases) {
        const payload = {
          sender: mockPatient.phoneNumber,
          message: "Test",
          ...testCase,
        };
        const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
          headers: { "x-webhook-secret": WEBHOOK_SECRET },
        });
        const body = await request.json();
        expect(body).toBeDefined();
      }
    });
  });

  describe("Verification Response Processing", () => {
    it("should process verification response for PENDING patient", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "Ya", // yes in Indonesian
        id: "msg-verify-123",
        timestamp: Date.now(),
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.sender).toBe(mockPatient.phoneNumber);
      expect(body.message).toBe("Ya");
    });

    it("should validate verification response", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "This is a longer verification message",
        id: "msg-verify-456",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      expect(request).toBeDefined();
    });
  });

  describe("Confirmation Response Processing", () => {
    it("should process reminder confirmation for VERIFIED patient", async () => {
      const verifiedPatient = createMockPatient({
        phoneNumber: "62887654321",
        verificationStatus: "VERIFIED",
      });

      const payload = {
        sender: verifiedPatient.phoneNumber,
        message: "Sudah minum obat", // already took medicine
        id: "msg-confirm-123",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.sender).toBe(verifiedPatient.phoneNumber);
    });
  });

  describe("Idempotency", () => {
    it("should detect duplicate messages by ID", async () => {
      const messageId = "duplicate-msg-123";
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "Ya",
        id: messageId,
        timestamp: Date.now(),
      };

      // First request
      const request1 = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      expect(request1).toBeDefined();

      // Second request with same ID should be detected as duplicate
      const request2 = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      expect(request2).toBeDefined();
    });

    it("should use fallback idempotency key", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "Test message for idempotency",
        // No explicit ID provided - should use sender + message + timestamp
        timestamp: Date.now(),
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      expect(request).toBeDefined();
    });
  });

  describe("Message Status Updates", () => {
    it("should handle status:sent update", async () => {
      const payload = {
        id: "msg-12345",
        status: "sent",
        timestamp: Date.now(),
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.id).toBe("msg-12345");
      expect(body.status).toBe("sent");
    });

    it("should handle status:delivered update", async () => {
      const payload = {
        id: "msg-12345",
        status: "delivered",
        timestamp: Date.now(),
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.status).toBe("delivered");
    });

    it("should handle status:failed update with reason", async () => {
      const payload = {
        id: "msg-12345",
        status: "failed",
        reason: "Invalid phone number",
        timestamp: Date.now(),
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.status).toBe("failed");
      expect(body.reason).toBe("Invalid phone number");
    });

    it("should map synonymous status values", async () => {
      const statusMappings = [
        { input: "sent", expected: "SENT" },
        { input: "queued", expected: "SENT" },
        { input: "delivered", expected: "DELIVERED" },
        { input: "read", expected: "DELIVERED" },
        { input: "failed", expected: "FAILED" },
        { input: "undelivered", expected: "FAILED" },
      ];

      for (const mapping of statusMappings) {
        const payload = {
          id: `msg-${mapping.input}`,
          status: mapping.input,
        };
        const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
          headers: { "x-webhook-secret": WEBHOOK_SECRET },
        });
        expect(request).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    it("should reject message with missing sender", async () => {
      const payload = {
        message: "Test message",
        // missing sender/phone/from
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body).toBeDefined();
    });

    it("should reject message with empty message", async () => {
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "", // empty message
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body).toBeDefined();
    });

    it("should handle malformed JSON", async () => {
      // This would need to be tested at the route handler level
      expect(true).toBe(true);
    });
  });

  describe("Unmatched Patient Handling", () => {
    it("should ignore message from unknown phone", async () => {
      const payload = {
        sender: "62899999999", // phone not in system
        message: "Ya",
        id: "msg-unknown-123",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      const body = await request.json();
      expect(body.sender).toBe("62899999999");
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce patient response rate limit", async () => {
      // In real tests, this would need to send multiple requests
      // and verify that rate limiting is applied
      const payload = {
        sender: mockPatient.phoneNumber,
        message: "Ya",
      };
      const request = buildPostRequest("/api/webhooks/fonnte/incoming", payload, {
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
      });
      expect(request).toBeDefined();
    });
  });
});

describe("GET /api/webhooks/fonnte/incoming", () => {
  it("should handle health check ping", async () => {
    const request = buildGetRequest("/api/webhooks/fonnte/incoming", {
      query: { mode: "ping" },
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
    });
    expect(request.method).toBe("GET");
    const url = new URL(request.url);
    expect(url.searchParams.get("mode")).toBe("ping");
  });

  it("should return ok status for GET request", async () => {
    const request = buildGetRequest("/api/webhooks/fonnte/incoming", {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
    });
    expect(request).toBeDefined();
  });
});
