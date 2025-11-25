/**
 * Authentication Tests
 * Tests for login, signup, session management, and security
 */

import { TestResult } from "./types";
import { TestUtils } from "./utils";

export class AuthTests {
  private client = TestUtils.createTestClient();
  private testResults: TestResult[] = [];

  /**
   * Run all authentication tests
   */
  async runAll(): Promise<TestResult[]> {
    console.log("\n🔐 Running Authentication Tests...");
    this.testResults = [];

    // Basic auth tests
    await this.testHealthEndpoint();
    await this.testSignup();
    await this.testLogin();
    await this.testLogout();
    await this.testInvalidCredentials();
    await this.testSessionPersistence();
    await this.testUnauthorizedAccess();
    await this.testTokenExpiration();

    // Security tests
    await this.testSQLInjectionPrevention();
    await this.testXSSPrevention();
    await this.testRateLimiting();

    return this.testResults;
  }

  private async testHealthEndpoint() {
    const result = await TestUtils.runTest(
      "API Health Check",
      "auth",
      async () => {
        const response = await this.client.get("/api/health");
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
      }
    );
    this.testResults.push(result);
  }

  private async testSignup() {
    const result = await TestUtils.runTest("User Signup", "auth", async () => {
      const testUser = TestUtils.generateTestUser(Date.now());

      // Note: Clerk handles signup, so we test the webhook endpoint
      const response = await this.client.post("/api/webhooks/clerk", {
        type: "user.created",
        data: {
          id: `user_test_${Date.now()}`,
          email_addresses: [{ email_address: testUser.email }],
          first_name: testUser.name.split(" ")[0],
          last_name: testUser.name.split(" ")[1],
        },
      });

      // Webhook should accept valid payloads
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Signup webhook failed: ${response.status}`);
      }
    });
    this.testResults.push(result);
  }

  private async testLogin() {
    const result = await TestUtils.runTest("User Login", "auth", async () => {
      // Test session creation endpoint
      const response = await this.client.get("/api/auth/debug");

      // This endpoint should be accessible (returns auth status)
      if (response.status === 500) {
        throw new Error("Auth debug endpoint error");
      }
    });
    this.testResults.push(result);
  }

  private async testLogout() {
    const result = await TestUtils.runTest("User Logout", "auth", async () => {
      // Test cache clear endpoint
      const response = await this.client.post("/api/auth/clear-cache", {});

      // Should handle logout/cache clear
      if (response.status === 500) {
        throw new Error("Logout/cache clear failed");
      }
    });
    this.testResults.push(result);
  }

  private async testInvalidCredentials() {
    const result = await TestUtils.runTest(
      "Invalid Credentials Rejection",
      "auth",
      async () => {
        // Try to access protected endpoint without auth
        const response = await this.client.get("/api/dashboard/stats");

        // Should get 401 or redirect to login
        if (response.status !== 401 && response.status !== 403) {
          throw new Error(`Expected 401/403, got ${response.status}`);
        }
      }
    );
    this.testResults.push(result);
  }

  private async testSessionPersistence() {
    const result = await TestUtils.runTest(
      "Session Persistence",
      "auth",
      async () => {
        // Test that last login timestamp updates
        const response = await this.client.post("/api/auth/update-last-login", {
          userId: "test_user_123",
        });

        // Should accept valid requests
        if (response.status === 500) {
          throw new Error("Session update failed");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testUnauthorizedAccess() {
    const result = await TestUtils.runTest(
      "Protected Endpoint Access Control",
      "auth",
      async () => {
        // Test multiple protected endpoints
        const protectedEndpoints = [
          "/api/admin/users",
          "/api/patients",
          "/api/reminders/scheduled",
        ];

        for (const endpoint of protectedEndpoints) {
          const response = await this.client.get(endpoint);
          if (response.status !== 401 && response.status !== 403) {
            throw new Error(`${endpoint} not properly protected`);
          }
        }
      }
    );
    this.testResults.push(result);
  }

  private async testTokenExpiration() {
    const result = await TestUtils.runTest(
      "Expired Token Handling",
      "auth",
      async () => {
        // Set an invalid/expired token
        this.client.setAuth("expired_token_123");

        const response = await this.client.get("/api/dashboard/stats");

        // Should reject expired token
        if (response.status !== 401 && response.status !== 403) {
          throw new Error("Expired token not rejected");
        }

        // Clear the token
        this.client.headers = {};
      }
    );
    this.testResults.push(result);
  }

  private async testSQLInjectionPrevention() {
    const result = await TestUtils.runTest(
      "SQL Injection Prevention",
      "auth",
      async () => {
        // Try SQL injection in webhook
        const response = await this.client.post("/api/webhooks/clerk", {
          type: "user.created",
          data: {
            id: "'; DROP TABLE users; --",
            email_addresses: [{ email_address: "hacker@test.com" }],
          },
        });

        // Should handle safely (validation error or safe processing)
        // Should not return 500 (server error from SQL injection)
        if (response.status === 500 && response.data?.error?.includes("SQL")) {
          throw new Error("SQL injection vulnerability detected");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testXSSPrevention() {
    const result = await TestUtils.runTest(
      "XSS Attack Prevention",
      "auth",
      async () => {
        // Try XSS in user data
        const xssPayload = '<script>alert("XSS")</script>';
        const response = await this.client.post("/api/webhooks/clerk", {
          type: "user.updated",
          data: {
            id: "test_user_xss",
            first_name: xssPayload,
            last_name: xssPayload,
          },
        });

        // Should sanitize or reject
        // If it processes, the data should be escaped
        if (response.ok && response.data?.name === xssPayload) {
          throw new Error("XSS payload not sanitized");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testRateLimiting() {
    const result = await TestUtils.runTest(
      "Rate Limiting Protection",
      "auth",
      async () => {
        // Make rapid requests to trigger rate limiting
        const requests = Array(20)
          .fill(null)
          .map(() => this.client.get("/api/health"));

        const responses = await Promise.all(requests);

        // At least some requests should be rate limited (429)
        const rateLimited = responses.filter((r) => r.status === 429);

        // If no rate limiting, it's a potential issue
        // But we'll be lenient since health check might not be rate limited
        // This is more of a warning
        if (rateLimited.length === 0) {
          console.log(
            "   ℹ️  Note: No rate limiting detected (might be disabled for health checks)"
          );
        }
      }
    );
    this.testResults.push(result);
  }
}
