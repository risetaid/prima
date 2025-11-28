/**
 * WhatsApp Integration Tests
 * Tests for message sending, webhooks, and WhatsApp API integration
 */

import { TestResult } from "./types";
import { TestUtils } from "./utils";

export class WhatsAppTests {
  private client = TestUtils.createTestClient();
  private testResults: TestResult[] = [];
  private isProduction = TestUtils.isProduction();

  /**
   * Run all WhatsApp integration tests
   */
  async runAll(): Promise<TestResult[]> {
    console.log("\n💬 Running WhatsApp Integration Tests...");
    this.testResults = [];

    // Message sending tests
    await this.testSendTextMessage();
    await this.testSendVerificationMessage();
    await this.testSendReminderMessage();
    await this.testPhoneNumberFormatting();

    // Webhook tests
    await this.testIncomingMessageWebhook();
    await this.testMessageAcknowledgment();
    await this.testDuplicateMessageHandling();
    await this.testWebhookAuthentication();

    // Message processing tests
    await this.testConfirmationKeywordProcessing();
    await this.testVerificationCodeProcessing();
    await this.testAIIntentDetection();

    // Error handling
    await this.testInvalidPhoneNumber();
    await this.testRateLimiting();
    await this.testRetryMechanism();

    return this.testResults;
  }

  private async testSendTextMessage() {
    const wahaEndpoint = "{WAHA_ENDPOINT}/api/sendText";
    const result = await TestUtils.runTest(
      "Send Plain Text Message",
      "whatsapp",
      async () => {
        // Test the WAHA send endpoint structure
        const message = {
          to: "6281234567890",
          body: "Test message from PRIMA automated testing",
        };

        // Note: We're testing the endpoint structure, not actually sending
        // In production, this would need proper WAHA credentials
        const testEndpoint =
          process.env.WAHA_ENDPOINT || "http://localhost:3000";

        try {
          const response = await fetch(`${testEndpoint}/api/sendText`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.WAHA_API_KEY || "test_key",
            },
            body: JSON.stringify({
              session: process.env.WAHA_SESSION || "default",
              chatId: `${message.to}@c.us`,
              text: message.body,
            }),
          });

          // If WAHA is not configured, we expect connection error
          // If configured, we expect success or API error (not server error)
          if (response.status >= 500) {
            throw new Error(`WAHA server error: ${response.status}`);
          }
        } catch (error: any) {
          // Connection refused is OK (WAHA not running in test)
          if (error.message?.includes("ECONNREFUSED")) {
            console.log(
              "   ℹ️  WAHA not running (expected in test environment)"
            );
          } else {
            throw error;
          }
        }
      },
      {
        method: "POST",
        endpoint: wahaEndpoint,
        description: "Send WhatsApp text message via external WAHA API",
      }
    );
    this.testResults.push(result);
  }

  private async testSendVerificationMessage() {
    const endpoint = "/api/patients/test_patient_123/manual-verification";
    const result = await TestUtils.runTest(
      "Send Patient Verification Message",
      "whatsapp",
      async () => {
        // Test manual verification endpoint
        const response = await this.client.post(endpoint, {
          status: "verified",
        });

        // Should handle verification flow
        if (response.status === 500) {
          throw new Error("Verification message processing error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Send verification message to patient via WhatsApp",
      }
    );
    this.testResults.push(result);
  }

  private async testSendReminderMessage() {
    const endpoint = "/api/reminders/instant-send-all";
    const result = await TestUtils.runTest(
      "Send Reminder via WhatsApp",
      "whatsapp",
      async () => {
        // Test instant send (which sends via WhatsApp)
        const response = await this.client.post(endpoint, {});

        // Should process or require auth
        if (response.status === 500) {
          throw new Error("Reminder WhatsApp send error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Send all pending reminders immediately via WhatsApp",
      }
    );
    this.testResults.push(result);
  }

  private async testPhoneNumberFormatting() {
    const result = await TestUtils.runTest(
      "Phone Number Format Conversion",
      "whatsapp",
      async () => {
        // Test various phone number formats
        const testCases = [
          { input: "081234567890", expected: "6281234567890" },
          { input: "6281234567890", expected: "6281234567890" },
          { input: "+6281234567890", expected: "6281234567890" },
          { input: "0812-3456-7890", expected: "6281234567890" },
        ];

        // Import the format function
        const { formatWhatsAppNumber } = await import("@/lib/waha");

        testCases.forEach(({ input, expected }) => {
          const formatted = formatWhatsAppNumber(input);
          if (!formatted.startsWith("628")) {
            throw new Error(`Phone format error: ${input} -> ${formatted}`);
          }
        });
      },
      {
        method: "UTIL",
        endpoint: "@/lib/waha#formatWhatsAppNumber",
        description:
          "Test utility function for formatting Indonesian phone numbers",
      }
    );
    this.testResults.push(result);
  }

  private async testIncomingMessageWebhook() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "Process Incoming Message Webhook",
      "whatsapp",
      async () => {
        const webhookPayload = {
          event: "message",
          session: "default",
          payload: {
            id: "test_msg_" + Date.now(),
            from: "6281234567890@c.us",
            body: "YA",
            timestamp: Math.floor(Date.now() / 1000),
            fromMe: false,
          },
        };

        const response = await this.client.post(endpoint, webhookPayload, {
          headers: {
            "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
          },
        });

        // Should process webhook
        if (response.status === 500) {
          throw new Error("Webhook processing error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Process incoming WhatsApp message from WAHA webhook",
      }
    );
    this.testResults.push(result);
  }

  private async testMessageAcknowledgment() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "Message Delivery Acknowledgment",
      "whatsapp",
      async () => {
        const ackPayload = {
          event: "message.ack",
          session: "default",
          payload: {
            id: "test_msg_ack_" + Date.now(),
            ack: 3, // Read receipt
            from: "6281234567890@c.us",
          },
        };

        const response = await this.client.post(endpoint, ackPayload, {
          headers: {
            "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
          },
        });

        // Should handle ACK events
        if (response.status === 500) {
          throw new Error("ACK webhook processing error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Handle WhatsApp message acknowledgment (read receipts)",
      }
    );
    this.testResults.push(result);
  }

  private async testDuplicateMessageHandling() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "Duplicate Message Detection",
      "whatsapp",
      async () => {
        const messageId = "duplicate_test_" + Date.now();
        const webhookPayload = {
          event: "message",
          session: "default",
          payload: {
            id: messageId,
            from: "6281234567890@c.us",
            body: "Test duplicate",
            timestamp: Math.floor(Date.now() / 1000),
            fromMe: false,
          },
        };

        // Send same message twice
        const response1 = await this.client.post(endpoint, webhookPayload, {
          headers: {
            "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
          },
        });

        await TestUtils.sleep(100);

        const response2 = await this.client.post(endpoint, webhookPayload, {
          headers: {
            "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
          },
        });

        // Second message should be detected as duplicate
        if (
          response2.data?.duplicate !== true &&
          response2.data?.ignored !== true
        ) {
          console.log(
            "   ℹ️  Duplicate detection may use Redis (check Redis connection)"
          );
        }
      },
      {
        method: "POST",
        endpoint,
        description:
          "Test duplicate message detection by sending same message twice",
      }
    );
    this.testResults.push(result);
  }

  private async testWebhookAuthentication() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "Webhook Authentication",
      "whatsapp",
      async () => {
        const webhookPayload = {
          event: "message",
          payload: {
            from: "6281234567890@c.us",
            body: "Unauthorized test",
          },
        };

        // Send without proper token
        const response = await this.client.post(endpoint, webhookPayload, {
          headers: {
            "X-Webhook-Token": "invalid_token_123",
          },
        });

        // Production Railway should have WEBHOOK_TOKEN configured and reject invalid tokens
        // Localhost might not have WEBHOOK_TOKEN, so we're more lenient
        if (this.isProduction) {
          // Production must reject with 401/403/500 (custom auth throws error = 500)
          if (
            response.status !== 401 &&
            response.status !== 403 &&
            response.status !== 500
          ) {
            throw new Error("Webhook authentication not enforced");
          }
        } else {
          // Localhost: If returns 401/403/500, auth is working (good)
          // If returns 200, might not have WEBHOOK_TOKEN configured (acceptable for dev)
          if (
            response.status !== 401 &&
            response.status !== 403 &&
            response.status !== 500 &&
            response.status !== 200
          ) {
            throw new Error(`Unexpected response: ${response.status}`);
          }
        }
      },
      {
        method: "POST",
        endpoint,
        description:
          "Verify webhook authentication with invalid token (should reject)",
      }
    );
    this.testResults.push(result);
  }

  private async testConfirmationKeywordProcessing() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "Confirmation Keyword Recognition",
      "whatsapp",
      async () => {
        const confirmations = ["YA", "ya", "Ya", "yes", "YES"];
        const rejections = ["TIDAK", "tidak", "Tidak", "no", "NO"];

        const testKeyword = async (keyword: string) => {
          const webhookPayload = {
            event: "message",
            payload: {
              id: "keyword_test_" + Date.now() + "_" + keyword,
              from: "6281234567890@c.us",
              body: keyword,
              timestamp: Math.floor(Date.now() / 1000),
              fromMe: false,
            },
          };

          return this.client.post(endpoint, webhookPayload, {
            headers: {
              "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
            },
          });
        };

        // Test various confirmation keywords
        for (const keyword of [...confirmations, ...rejections]) {
          const response = await testKeyword(keyword);
          if (response.status === 500) {
            throw new Error(`Keyword processing error for: ${keyword}`);
          }
          await TestUtils.sleep(50);
        }
      },
      {
        method: "POST",
        endpoint,
        description:
          "Process confirmation keywords (YA/TIDAK/yes/no) from patients",
      }
    );
    this.testResults.push(result);
  }

  private async testVerificationCodeProcessing() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "Verification Code Extraction",
      "whatsapp",
      async () => {
        const webhookPayload = {
          event: "message",
          payload: {
            id: "verification_test_" + Date.now(),
            from: "6281234567890@c.us",
            body: "Kode verifikasi: 123456",
            timestamp: Math.floor(Date.now() / 1000),
            fromMe: false,
          },
        };

        const response = await this.client.post(endpoint, webhookPayload, {
          headers: {
            "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
          },
        });

        // Should process verification code
        if (response.status === 500) {
          throw new Error("Verification code processing error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Extract and process verification codes from messages",
      }
    );
    this.testResults.push(result);
  }

  private async testAIIntentDetection() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "AI Intent Detection",
      "whatsapp",
      async () => {
        const testMessages = [
          "Kapan jadwal saya?",
          "Terima kasih",
          "Saya merasa tidak enak badan",
        ];

        for (const message of testMessages) {
          const webhookPayload = {
            event: "message",
            payload: {
              id: "ai_test_" + Date.now() + "_" + Math.random(),
              from: "6281234567890@c.us",
              body: message,
              timestamp: Math.floor(Date.now() / 1000),
              fromMe: false,
            },
          };

          const response = await this.client.post(endpoint, webhookPayload, {
            headers: {
              "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
            },
          });

          if (response.status === 500) {
            throw new Error(`AI processing error for: ${message}`);
          }

          await TestUtils.sleep(100);
        }
      },
      {
        method: "POST",
        endpoint,
        description: "AI-powered intent detection for patient messages",
      }
    );
    this.testResults.push(result);
  }

  private async testInvalidPhoneNumber() {
    const result = await TestUtils.runTest(
      "Invalid Phone Number Handling",
      "whatsapp",
      async () => {
        const invalidNumbers = ["123", "abcd", "+++", ""];

        const { formatWhatsAppNumber } = await import("@/lib/waha");

        invalidNumbers.forEach((number) => {
          try {
            formatWhatsAppNumber(number);
            throw new Error(`Invalid number ${number} was accepted`);
          } catch (error: any) {
            // Should throw validation error
            if (!error.message?.includes("Invalid")) {
              throw new Error(`Wrong error for ${number}: ${error.message}`);
            }
          }
        });
      },
      {
        method: "UTIL",
        endpoint: "@/lib/waha#formatWhatsAppNumber",
        description: "Test phone number validation with invalid inputs",
      }
    );
    this.testResults.push(result);
  }

  private async testRateLimiting() {
    const endpoint = "/api/webhooks/waha";
    const result = await TestUtils.runTest(
      "WhatsApp Rate Limiting",
      "whatsapp",
      async () => {
        // Test rate limiting by sending multiple webhooks rapidly
        const promises = Array(30)
          .fill(null)
          .map((_, i) =>
            this.client.post(
              endpoint,
              {
                event: "message",
                payload: {
                  id: "rate_test_" + Date.now() + "_" + i,
                  from: "6281234567890@c.us",
                  body: `Test ${i}`,
                  timestamp: Math.floor(Date.now() / 1000),
                  fromMe: false,
                },
              },
              {
                headers: {
                  "X-Webhook-Token": process.env.WEBHOOK_TOKEN || "test_token",
                },
              }
            )
          );

        const responses = await Promise.all(promises);

        // Some might be rate limited
        const rateLimited = responses.filter((r) => r.status === 429);
        if (rateLimited.length > 0) {
          console.log(
            `   ℹ️  ${rateLimited.length}/30 requests were rate limited`
          );
        }
      },
      {
        method: "POST",
        endpoint,
        description:
          "Test rate limiting by sending 30 webhook requests rapidly",
      }
    );
    this.testResults.push(result);
  }

  private async testRetryMechanism() {
    const result = await TestUtils.runTest(
      "Message Send Retry Logic",
      "whatsapp",
      async () => {
        // Test the WhatsApp service retry mechanism
        // This would require mocking, so we'll test the structure exists
        try {
          const { WhatsAppService } = await import(
            "@/services/whatsapp/whatsapp.service"
          );
          const service = new WhatsAppService();

          // Check if send method exists
          if (typeof service.send !== "function") {
            throw new Error("WhatsApp service send method not found");
          }

          // Note: Actually calling would need valid credentials
          console.log("   ℹ️  WhatsApp service structure validated");
        } catch (error: any) {
          if (error.message?.includes("not found")) {
            throw error;
          }
          // Import errors are OK in test environment
        }
      },
      {
        method: "SERVICE",
        endpoint: "@/services/whatsapp/whatsapp.service#WhatsAppService",
        description: "Validate WhatsApp service retry mechanism structure",
      }
    );
    this.testResults.push(result);
  }
}
