import { db } from "@/db";
import { whatsappTemplates } from "@/db/reminder-schema";
import { eq } from "drizzle-orm";

async function updateFollowupTemplate() {
  try {
    console.log("Updating follow-up reminder template...");

    const result = await db
      .update(whatsappTemplates)
      .set({
        templateText: "Halo {nama}, apakah pengingat sebelumnya sudah dipatuhi?",
        updatedAt: new Date(),
      })
      .where(eq(whatsappTemplates.templateName, "follow_up_reminder"))
      .returning();

    console.log("Template updated successfully:", result);
    console.log("✅ Follow-up template has been updated to use general language");

    return result;
  } catch (error) {
    console.error("Failed to update follow-up template:", error);
    throw error;
  }
}

// Run the update
updateFollowupTemplate()
  .then(() => {
    console.log("✅ Follow-up template update completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Follow-up template update failed:", error);
    process.exit(1);
  });