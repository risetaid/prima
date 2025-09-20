import { db } from "@/db";
import { whatsappTemplates } from "@/db/reminder-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

async function updateFollowupTemplate() {
  try {
    logger.info("Updating follow-up reminder template...");

    const result = await db
      .update(whatsappTemplates)
      .set({
        templateText: "Halo {nama}, apakah pengingat sebelumnya sudah dipatuhi?",
        updatedAt: new Date(),
      })
      .where(eq(whatsappTemplates.templateName, "follow_up_reminder"))
      .returning();

    logger.info("Template updated successfully:", { result });
    logger.info("✅ Follow-up template has been updated to use general language");

    return result;
  } catch (error) {
    logger.error("Failed to update follow-up template:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Run the update
updateFollowupTemplate()
  .then(() => {
    logger.info("✅ Follow-up template update completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("❌ Follow-up template update failed:", error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });