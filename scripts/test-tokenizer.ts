/**
 * Test script for the new tokenizer service
 */

import { tokenizerService } from "../src/lib/tokenizer";

async function testTokenizer() {
  console.log("Testing Tokenizer Service...\n");

  // Test basic token counting
  const testText = "Hello, how are you today? I hope you're feeling well.";
  const count = tokenizerService.countTokens(testText, "gemini-2.0-flash-exp");

  console.log("Basic token counting:");
  console.log(`Text: "${testText}"`);
  console.log(`Tokens: ${count.tokens}, Characters: ${count.characters}\n`);

  // Test conversation token counting
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello, how are you?" },
    { role: "assistant", content: "I'm doing well, thank you for asking!" }
  ];

  const conversationCount = tokenizerService.countConversationTokens(messages, "gemini-2.0-flash-exp");
  console.log("Conversation token counting:");
  console.log(`Messages: ${messages.length}`);
  console.log(`Total tokens: ${conversationCount.tokens}, Characters: ${conversationCount.characters}\n`);

  // Test cost estimation
  const cost = tokenizerService.estimateCost(count.tokens, "gemini-2.0-flash-exp");
  console.log("Cost estimation:");
  console.log(`Tokens: ${count.tokens}`);
  console.log(`Estimated cost: $${cost.toFixed(6)}\n`);

  // Test usage counting
  const usage = tokenizerService.countUsage(
    "Hello, how are you?",
    "I'm doing well, thank you!",
    "gemini-2.0-flash-exp"
  );

  console.log("Usage counting:");
  console.log(`Input tokens: ${usage.inputTokens}`);
  console.log(`Output tokens: ${usage.outputTokens}`);
  console.log(`Total tokens: ${usage.totalTokens}`);
  console.log(`Model: ${usage.model}\n`);

  // Test supported models
  const models = tokenizerService.getSupportedModels();
  console.log("Supported models:");
  console.log(models.join(", "));

  console.log("\n✅ All tests completed successfully!");
}

// Run the test
testTokenizer().catch(console.error);