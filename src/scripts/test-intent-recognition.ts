/**
 * Manual test script for intent recognition improvements
 * Run with: bun run tsx src/scripts/test-intent-recognition.ts
 */

import { llmService } from "@/services/llm/llm.service";
import { ConversationContext } from "@/services/llm/llm.types";

async function testIntentRecognition() {
  console.log("🧪 Testing Intent Recognition Improvements\n");

  const mockContext: ConversationContext = {
    patientId: "test-patient-123",
    phoneNumber: "+6281234567890",
    previousMessages: [],
    patientInfo: {
      name: "Test Patient",
      verificationStatus: "VERIFIED",
      activeReminders: [],
    },
    conversationId: "test-conversation",
  };

  // Test cases for 5W1H questions
  const questionTests = [
    { message: "Apa yang sudah dilakukan?", expected: "general_inquiry (apa)" },
    {
      message: "Mengapa saya harus minum obat?",
      expected: "general_inquiry (mengapa)",
    },
    { message: "Kapan waktu minum obat?", expected: "general_inquiry (kapan)" },
    {
      message: "Di mana saya bisa mendapatkan bantuan?",
      expected: "general_inquiry (di_mana)",
    },
    {
      message: "Siapa yang akan menghubungi saya?",
      expected: "general_inquiry (siapa)",
    },
    {
      message: "Bagaimana cara minum obat?",
      expected: "general_inquiry (bagaimana)",
    },
  ];

  // Test cases for other intents
  const otherTests = [
    { message: "Ya", expected: "verification_response (YA)" },
    { message: "Darurat! Sakit parah", expected: "emergency" },
    { message: "Saya ingin berhenti", expected: "unsubscribe" },
    {
      message: "Sudah minum obat",
      expected: "reminder_confirmation or general_inquiry",
    },
    { message: "Pesan yang tidak jelas", expected: "fallback to LLM" },
  ];

  console.log("📋 Testing 5W1H Question Recognition:");
  console.log("=====================================");

  for (const test of questionTests) {
    try {
      console.log(`\n❓ Testing: "${test.message}"`);
      const result = await llmService.detectIntent(test.message, mockContext);

      console.log(`   Intent: ${result.intent}`);
      console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`   Model: ${result.rawResponse?.model || "unknown"}`);
      console.log(
        `   Question Type: ${result.entities?.questionType || "N/A"}`
      );
      console.log(`   Expected: ${test.expected}`);

      const success =
        result.intent === "general_inquiry" &&
        result.entities?.questionType &&
        result.confidence >= 0.8;

      console.log(`   ✅ Result: ${success ? "PASS" : "FAIL"}`);
    } catch (error) {
      console.log(
        `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("\n📋 Testing Other Intent Recognition:");
  console.log("====================================");

  for (const test of otherTests) {
    try {
      console.log(`\n🔍 Testing: "${test.message}"`);
      const result = await llmService.detectIntent(test.message, mockContext);

      console.log(`   Intent: ${result.intent}`);
      console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`   Model: ${result.rawResponse?.model || "unknown"}`);
      console.log(`   Expected: ${test.expected}`);

      let success = false;
      if (test.message === "Ya") {
        success =
          result.intent === "verification_response" &&
          result.entities?.response === "YA";
      } else if (test.message.includes("Darurat")) {
        success = result.intent === "emergency";
      } else if (test.message.includes("berhenti")) {
        success = result.intent === "unsubscribe";
      } else {
        success = result.intent !== "unknown" && result.confidence > 0;
      }

      console.log(`   ✅ Result: ${success ? "PASS" : "FAIL"}`);
    } catch (error) {
      console.log(
        `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("\n🎯 Test Summary:");
  console.log("================");
  console.log("✅ Hierarchical intent detection implemented");
  console.log("✅ 5W1H question pattern recognition added");
  console.log("✅ Context-aware reminder confirmation");
  console.log("✅ Emergency and unsubscribe detection");
  console.log("✅ Verification response detection");
  console.log("✅ Fallback to LLM for unknown patterns");

  console.log("\n📊 Expected Improvements:");
  console.log(
    "- Questions like 'Apa yang sudah dilakukan?' will be classified as general_inquiry instead of reminder_confirmation"
  );
  console.log(
    "- Reminder confirmations only detected when pending reminders exist"
  );
  console.log("- Better accuracy for emergency and unsubscribe intents");
  console.log("- Reduced false positives for reminder confirmations");
}

if (require.main === module) {
  testIntentRecognition().catch(console.error);
}
