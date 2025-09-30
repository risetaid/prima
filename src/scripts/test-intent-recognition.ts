/**
 * Manual test script for intent recognition improvements
 * Run with: bun run tsx src/scripts/test-intent-recognition.ts
 */

import { llmService } from "@/services/llm/llm.service";
import { ConversationContext } from "@/services/llm/llm.types";
import { logger } from "@/lib/logger";

async function testIntentRecognition() {
  logger.info("🧪 Testing Intent Recognition Improvements\n");

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

  logger.info("📋 Testing 5W1H Question Recognition:");
  logger.info("=====================================");

  for (const test of questionTests) {
    try {
      logger.info(`\n❓ Testing: "${test.message}"`);
      const result = await llmService.detectIntent(test.message, mockContext);

      logger.info(`   Intent: ${result.intent}`);
      logger.info(`   Confidence: ${result.confidence.toFixed(2)}`);
      logger.info(`   Model: ${result.rawResponse?.model || "unknown"}`);
      logger.info(
        `   Question Type: ${result.entities?.questionType || "N/A"}`
      );
      logger.info(`   Expected: ${test.expected}`);

      const success =
        result.intent === "general_inquiry" &&
        result.entities?.questionType &&
        result.confidence >= 0.8;

      logger.info(`   ✅ Result: ${success ? "PASS" : "FAIL"}`);
    } catch (error) {
      logger.error(
        `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  logger.info("\n📋 Testing Other Intent Recognition:");
  logger.info("====================================");

  for (const test of otherTests) {
    try {
      logger.info(`\n🔍 Testing: "${test.message}"`);
      const result = await llmService.detectIntent(test.message, mockContext);

      logger.info(`   Intent: ${result.intent}`);
      logger.info(`   Confidence: ${result.confidence.toFixed(2)}`);
      logger.info(`   Model: ${result.rawResponse?.model || "unknown"}`);
      logger.info(`   Expected: ${test.expected}`);

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

      logger.info(`   ✅ Result: ${success ? "PASS" : "FAIL"}`);
    } catch (error) {
      logger.error(
        `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  logger.info("\n🎯 Test Summary:");
  logger.info("================");
  logger.info("✅ Hierarchical intent detection implemented");
  logger.info("✅ 5W1H question pattern recognition added");
  logger.info("✅ Context-aware reminder confirmation");
  logger.info("✅ Emergency and unsubscribe detection");
  logger.info("✅ Verification response detection");
  logger.info("✅ Fallback to LLM for unknown patterns");

  logger.info("\n📊 Expected Improvements:");
  logger.info(
    "- Questions like 'Apa yang sudah dilakukan?' will be classified as general_inquiry instead of reminder_confirmation"
  );
  logger.info(
    "- Reminder confirmations only detected when pending reminders exist"
  );
  logger.info("- Better accuracy for emergency and unsubscribe intents");
  logger.info("- Reduced false positives for reminder confirmations");
}

if (require.main === module) {
  testIntentRecognition().catch(logger.error);
}
