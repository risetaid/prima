#!/usr/bin/env bun

// Test the new simple confirmation system with David's reminder
import { SimpleConfirmationService } from "@/services/simple-confirmation.service";
import { logger } from "@/lib/logger";

async function testSimpleConfirmation() {
  const simpleService = new SimpleConfirmationService();

  // Test data: David's phone and "SUDAH" response
  const sender = "081333852187";
  const message = "SUDAH";

  try {
    logger.info("Testing simple confirmation system", {
      sender,
      message,
      testType: "reminder_confirmation"
    });

    const result = await simpleService.processReminderResponse(sender, message);

    logger.info("Simple confirmation test result", {
      success: result.success,
      action: result.action,
      error: result.error
    });

    return result;
  } catch (error) {
    logger.error("Simple confirmation test failed", error as Error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Run if called directly
if (import.meta.main) {
  const result = await testSimpleConfirmation();
  console.log(`Test ${result.success ? "PASSED" : "FAILED"}:`, result);
  process.exit(result.success ? 0 : 1);
}

export { testSimpleConfirmation };