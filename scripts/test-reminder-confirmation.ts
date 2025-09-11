/**
 * Test script for reminder confirmation API
 * Run this to test the confirmation endpoint with sample data
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

async function testReminderConfirmation(): Promise<void> {
  console.log("🧪 Testing Reminder Confirmation API");
  console.log("=====================================");

  // Test data - you'll need to replace these with actual IDs from your database
  const testPatientId = "9831df16-f7e1-4f8a-82ed-dd201ace984d"; // The patient ID from the issue
  const testReminderId = "sample-reminder-log-id"; // You'll need to get this from the database

  console.log("📋 Test Configuration:");
  console.log(`   Patient ID: ${testPatientId}`);
  console.log(`   Reminder ID: ${testReminderId}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log();

  // Test 1: Confirm medication taken (true)
  console.log("✅ Test 1: Confirm medication taken (Ya)");
  const result1 = await testConfirmation(testPatientId, testReminderId, true);
  console.log(`   Result: ${result1.success ? "PASS" : "FAIL"}`);
  console.log(`   Message: ${result1.message}`);
  if (result1.error) {
    console.log(`   Error: ${JSON.stringify(result1.error, null, 2)}`);
  }
  console.log();

  // Test 2: Confirm medication not taken (false)
  console.log("❌ Test 2: Confirm medication not taken (Tidak)");
  const result2 = await testConfirmation(testPatientId, testReminderId, false);
  console.log(`   Result: ${result2.success ? "PASS" : "FAIL"}`);
  console.log(`   Message: ${result2.message}`);
  if (result2.error) {
    console.log(`   Error: ${JSON.stringify(result2.error, null, 2)}`);
  }
  console.log();

  // Test 3: Test with invalid reminder ID
  console.log("🔍 Test 3: Test with invalid reminder ID");
  const result3 = await testConfirmation(testPatientId, "invalid-id", true);
  console.log(`   Result: ${result3.success ? "PASS" : "FAIL"}`);
  console.log(`   Message: ${result3.message}`);
  if (result3.error) {
    console.log(`   Error: ${JSON.stringify(result3.error, null, 2)}`);
  }
  console.log();

  console.log("🎯 Test Summary:");
  console.log(`   Test 1 (Ya): ${result1.success ? "✅" : "❌"}`);
  console.log(`   Test 2 (Tidak): ${result2.success ? "✅" : "❌"}`);
  console.log(`   Test 3 (Invalid): ${result3.success ? "✅" : "❌"}`);

  if (!result1.success || !result2.success) {
    console.log();
    console.log(
      "⚠️  Some tests failed. Check the server logs for detailed error information."
    );
    console.log(
      "   The API now has comprehensive logging to help identify the issue."
    );
  }
}

async function testConfirmation(
  patientId: string,
  reminderId: string,
  medicationTaken: boolean
): Promise<TestResult> {
  try {
    const response = await fetch(
      `${BASE_URL}/api/patients/${patientId}/reminders/${reminderId}/confirm`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicationTaken,
          reminderLogId: reminderId,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: "Confirmation successful",
        data,
      };
    } else {
      return {
        success: false,
        message: data.error || "Unknown error",
        error: data,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Network error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Instructions for use
console.log("📖 Instructions:");
console.log("1. Make sure your Next.js development server is running");
console.log(
  "2. Update the testPatientId and testReminderId variables with actual values"
);
console.log(
  "3. Run this script: npx tsx scripts/test-reminder-confirmation.ts"
);
console.log(
  "4. Check both the test output and server console logs for detailed information"
);
console.log();

// Uncomment the line below to run the test
// testReminderConfirmation().catch(console.error)

export { testReminderConfirmation };
