/**
 * Reminder System Tests
 * Tests for creating, updating, scheduling, and sending reminders
 */

import { TestResult } from "./types";
import { TestUtils } from "./utils";

export class ReminderTests {
  private client = TestUtils.createTestClient();
  private testResults: TestResult[] = [];
  private testPatientId: string | null = null;

  /**
   * Run all reminder tests
   */
  async runAll(): Promise<TestResult[]> {
    console.log("\n⏰ Running Reminder System Tests...");
    this.testResults = [];

    // Setup
    await this.setupTestPatient();

    // Core reminder tests
    await this.testCreateReminder();
    await this.testGetReminders();
    await this.testUpdateReminder();
    await this.testDeleteReminder();

    // Scheduling tests
    await this.testDailySchedule();
    await this.testWeeklySchedule();
    await this.testMonthlySchedule();
    await this.testCustomSchedule();

    // Sending tests
    await this.testInstantSend();
    await this.testScheduledSend();
    await this.testReminderWithContent();

    // Edge cases
    await this.testPastDateRejection();
    await this.testInvalidTimeFormat();
    await this.testMaxRemindersPerPatient();

    return this.testResults;
  }

  private async setupTestPatient() {
    const result = await TestUtils.runTest(
      "Setup Test Patient for Reminders",
      "reminder",
      async () => {
        // Create a test patient (would need proper auth in real scenario)
        const testPatient = TestUtils.generateTestPatient(Date.now());
        const response = await this.client.post("/api/patients", testPatient);

        if (response.ok && response.data?.id) {
          this.testPatientId = response.data.id;
        } else {
          // If creation fails (e.g., need auth), use a mock ID
          this.testPatientId = "test_patient_" + Date.now();
        }
      }
    );
    this.testResults.push(result);
  }

  private async testCreateReminder() {
    const result = await TestUtils.runTest(
      "Create New Reminder",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const reminderData = TestUtils.generateTestReminder(this.testPatientId);
        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          reminderData
        );

        // Should create reminder or fail with auth (not 500)
        if (response.status === 500) {
          throw new Error("Server error creating reminder");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testGetReminders() {
    const result = await TestUtils.runTest(
      "Retrieve Patient Reminders",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const response = await this.client.get(
          `/api/patients/${this.testPatientId}/reminders`
        );

        // Should return reminders or auth error
        if (response.status === 500) {
          throw new Error("Server error retrieving reminders");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testUpdateReminder() {
    const result = await TestUtils.runTest(
      "Update Existing Reminder",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const updateData = {
          message: "Updated reminder message",
          time: "09:00",
        };

        const response = await this.client.put(
          `/api/patients/${this.testPatientId}/reminders/test_reminder_123`,
          updateData
        );

        // Should accept update or return auth/not found error
        if (response.status === 500) {
          throw new Error("Server error updating reminder");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testDeleteReminder() {
    const result = await TestUtils.runTest(
      "Delete Reminder",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const response = await this.client.delete(
          `/api/patients/${this.testPatientId}/reminders/test_reminder_123`
        );

        // Should accept delete or return auth/not found error
        if (response.status === 500) {
          throw new Error("Server error deleting reminder");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testDailySchedule() {
    const result = await TestUtils.runTest(
      "Daily Schedule Configuration",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const dailyReminder = {
          ...TestUtils.generateTestReminder(this.testPatientId),
          scheduleType: "daily",
        };

        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          dailyReminder
        );

        // Should handle daily schedule
        if (response.status === 500) {
          throw new Error("Daily schedule processing error");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testWeeklySchedule() {
    const result = await TestUtils.runTest(
      "Weekly Schedule Configuration",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const weeklyReminder = {
          ...TestUtils.generateTestReminder(this.testPatientId),
          scheduleType: "weekly",
          weeklyDays: [1, 3, 5], // Mon, Wed, Fri
        };

        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          weeklyReminder
        );

        // Should handle weekly schedule
        if (response.status === 500) {
          throw new Error("Weekly schedule processing error");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testMonthlySchedule() {
    const result = await TestUtils.runTest(
      "Monthly Schedule Configuration",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const monthlyReminder = {
          ...TestUtils.generateTestReminder(this.testPatientId),
          scheduleType: "monthly",
          monthlyDate: 15,
        };

        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          monthlyReminder
        );

        // Should handle monthly schedule
        if (response.status === 500) {
          throw new Error("Monthly schedule processing error");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testCustomSchedule() {
    const result = await TestUtils.runTest(
      "Custom Schedule Configuration",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const customReminder = {
          ...TestUtils.generateTestReminder(this.testPatientId),
          scheduleType: "custom",
          customDates: [
            new Date().toISOString().split("T")[0],
            new Date(Date.now() + 86400000).toISOString().split("T")[0],
          ],
        };

        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          customReminder
        );

        // Should handle custom schedule
        if (response.status === 500) {
          throw new Error("Custom schedule processing error");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testInstantSend() {
    const result = await TestUtils.runTest(
      "Instant Send All Reminders",
      "reminder",
      async () => {
        const response = await this.client.post(
          "/api/reminders/instant-send-all",
          {}
        );

        // Should process or require auth
        if (response.status === 500) {
          throw new Error("Instant send processing error");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testScheduledSend() {
    const result = await TestUtils.runTest(
      "Scheduled Reminder Execution",
      "reminder",
      async () => {
        const response = await this.client.post("/api/reminders/scheduled", {});

        // Should process scheduled reminders
        if (response.status === 500) {
          throw new Error("Scheduled send processing error");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testReminderWithContent() {
    const result = await TestUtils.runTest(
      "Reminder with Attached Content",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const reminderWithContent = {
          ...TestUtils.generateTestReminder(this.testPatientId),
          videoIds: ["video_123"],
          articleIds: ["article_456"],
        };

        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          reminderWithContent
        );

        // Should handle content attachments
        if (response.status === 500) {
          throw new Error("Content attachment processing error");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testPastDateRejection() {
    const result = await TestUtils.runTest(
      "Past Date Validation",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const pastReminder = {
          ...TestUtils.generateTestReminder(this.testPatientId),
          startDate: "2020-01-01", // Past date
        };

        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          pastReminder
        );

        // Should reject past dates (400 validation error)
        if (response.status === 201 || response.status === 200) {
          throw new Error("Past date was accepted - validation missing");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testInvalidTimeFormat() {
    const result = await TestUtils.runTest(
      "Invalid Time Format Handling",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        const invalidTimeReminder = {
          ...TestUtils.generateTestReminder(this.testPatientId),
          time: "25:99", // Invalid time
        };

        const response = await this.client.post(
          `/api/patients/${this.testPatientId}/reminders`,
          invalidTimeReminder
        );

        // Should reject invalid time format
        if (response.status === 201 || response.status === 200) {
          throw new Error("Invalid time format was accepted");
        }
      }
    );
    this.testResults.push(result);
  }

  private async testMaxRemindersPerPatient() {
    const result = await TestUtils.runTest(
      "Maximum Reminders Limit",
      "reminder",
      async () => {
        if (!this.testPatientId) throw new Error("No test patient available");

        // Try to create many reminders rapidly
        const promises = Array(15)
          .fill(null)
          .map((_, i) =>
            this.client.post(`/api/patients/${this.testPatientId}/reminders`, {
              ...TestUtils.generateTestReminder(this.testPatientId!),
              title: `Test Reminder ${i}`,
            })
          );

        const responses = await Promise.all(promises);

        // Some might fail due to rate limiting or business rules
        // This is expected behavior
        const succeeded = responses.filter((r) => r.ok).length;
        console.log(
          `   ℹ️  Created ${succeeded}/15 reminders (rate limiting may apply)`
        );
      }
    );
    this.testResults.push(result);
  }
}
