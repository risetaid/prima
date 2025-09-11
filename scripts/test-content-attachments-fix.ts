import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { ValidatedContent } from "@/services/reminder/reminder.types";

async function testContentAttachmentsFix() {
  console.log("🧪 Testing Content Attachments Fix");
  console.log("=".repeat(50));

  const whatsappService = new WhatsAppService();

  // Test data that simulates what the cron job would retrieve
  const testAttachments: ValidatedContent[] = [
    {
      id: "test-article-1",
      type: "article",
      title: "Cara Mengelola Diabetes dengan Baik",
      url: "https://example.com/articles/cara-mengelola-diabetes",
    },
    {
      id: "test-video-1",
      type: "video",
      title: "Video Edukasi Obat Diabetes",
      url: "https://example.com/videos/edukasi-obat-diabetes",
    },
  ];

  const baseMessage =
    "Halo John, jangan lupa minum obat Metformin pada waktu yang tepat.";

  console.log("📝 Base Message:", baseMessage);
  console.log("\n📎 Content Attachments:");
  testAttachments.forEach((attachment, index) => {
    console.log(`  ${index + 1}. ${attachment.title} (${attachment.type})`);
    console.log(`     URL: ${attachment.url}`);
  });

  // Build the message using the WhatsApp service
  const enhancedMessage = whatsappService.buildMessage(
    baseMessage,
    testAttachments
  );

  console.log("\n📱 Final WhatsApp Message:");
  console.log("=".repeat(50));
  console.log(enhancedMessage);
  console.log("=".repeat(50));

  // Verify the message contains the expected content
  const hasArticlePrefix = enhancedMessage.includes("📚 Baca juga:");
  const hasVideoPrefix = enhancedMessage.includes("🎥 Tonton juga:");
  const hasArticleTitle = enhancedMessage.includes(
    "Cara Mengelola Diabetes dengan Baik"
  );
  const hasVideoTitle = enhancedMessage.includes("Video Edukasi Obat Diabetes");
  const hasArticleUrl = enhancedMessage.includes(
    "https://example.com/articles/cara-mengelola-diabetes"
  );
  const hasVideoUrl = enhancedMessage.includes(
    "https://example.com/videos/edukasi-obat-diabetes"
  );
  const hasSignature = enhancedMessage.includes("💙 Tim PRIMA");

  console.log("\n✅ Verification Results:");
  console.log(`Article prefix found: ${hasArticlePrefix}`);
  console.log(`Video prefix found: ${hasVideoPrefix}`);
  console.log(`Article title found: ${hasArticleTitle}`);
  console.log(`Video title found: ${hasVideoTitle}`);
  console.log(`Article URL found: ${hasArticleUrl}`);
  console.log(`Video URL found: ${hasVideoUrl}`);
  console.log(`Signature found: ${hasSignature}`);

  const allTestsPass =
    hasArticlePrefix &&
    hasVideoPrefix &&
    hasArticleTitle &&
    hasVideoTitle &&
    hasArticleUrl &&
    hasVideoUrl &&
    hasSignature;

  console.log(
    `\n🎯 Overall Test Result: ${allTestsPass ? "✅ PASSED" : "❌ FAILED"}`
  );

  if (!allTestsPass) {
    console.log("\n❌ Issues found:");
    if (!hasArticleTitle || !hasVideoTitle) {
      console.log(
        "  - Content titles are undefined (this was the original bug)"
      );
    }
    if (!hasArticleUrl || !hasVideoUrl) {
      console.log("  - Content URLs are undefined (this was the original bug)");
    }
  } else {
    console.log("\n✅ All content attachments are properly formatted!");
    console.log("The fix for the property name mismatch is working correctly.");
  }
}

testContentAttachmentsFix().catch(console.error);
