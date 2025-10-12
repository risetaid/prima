#!/usr/bin/env bun

// Test consolidated webhook for both incoming messages and status updates
import { logger } from "@/lib/logger";

async function testConsolidatedWebhook() {
  try {
    logger.info("Testing consolidated webhook functionality");

    // Test 1: Mock incoming message (patient response)
    logger.info("Test 1: Mock incoming patient message");

    const incomingPayload = {
      sender: "081333852187",
      message: "SUDAH",
      id: "test-msg-123",
      timestamp: Date.now()
    };

    const incomingResponse = await fetch('http://localhost:3000/api/webhooks/fonnte/incoming', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(incomingPayload)
    });

    logger.info("Incoming message test result", {
      status: incomingResponse.status,
      ok: incomingResponse.ok
    });

    // Test 2: Mock message status update
    logger.info("Test 2: Mock message status update");

    const statusPayload = {
      id: "test-msg-123",
      status: "delivered",
      timestamp: Date.now()
    };

    const statusResponse = await fetch('http://localhost:3000/api/webhooks/fonnte/incoming', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(statusPayload)
    });

    logger.info("Status update test result", {
      status: statusResponse.status,
      ok: statusResponse.ok
    });

    return {
      success: true,
      incomingTest: incomingResponse.ok,
      statusTest: statusResponse.ok
    };

  } catch (error) {
    logger.error("Consolidated webhook test failed", error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Run if called directly
if (import.meta.main) {
  const result = await testConsolidatedWebhook();
  console.log(`Consolidated webhook test ${result.success ? "PASSED" : "FAILED"}:`, result);
  process.exit(result.success ? 0 : 1);
}

export { testConsolidatedWebhook };