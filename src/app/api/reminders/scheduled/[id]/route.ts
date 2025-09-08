import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  db,
  reminderSchedules,
  patients,
  reminderContentAttachments,
  cmsArticles,
  cmsVideos,
} from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { reminderTime, customMessage, attachedContent } =
      await request.json();

    if (!reminderTime || !customMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate attached content if provided
    let validatedContent: Array<{
      id: string;
      type: "article" | "video";
      title: string;
      url: string;
    }> = [];
    if (
      attachedContent &&
      Array.isArray(attachedContent) &&
      attachedContent.length > 0
    ) {
      validatedContent = await validateContentAttachments(attachedContent);
    }

    // Find the reminder schedule
    const reminderScheduleResult = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        scheduledTime: reminderSchedules.scheduledTime,
        customMessage: reminderSchedules.customMessage,
        medicationName: reminderSchedules.medicationName,
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.id, id))
      .limit(1);

    if (reminderScheduleResult.length === 0) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const reminderSchedule = reminderScheduleResult[0];

    // Improved medication name extraction from custom message
    function extractMedicationName(message: string, currentMedicationName?: string): string {
      const words = message.toLowerCase().split(/[\s,\.]+/); // Split by space, comma, period
      
      // Common medication patterns
      const medicationKeywords = [
        // Common medications
        "candesartan", "paracetamol", "amoxicillin", "metformin", "ibuprofen", 
        "aspirin", "omeprazole", "simvastatin", "atorvastatin", "amlodipine",
        "lisinopril", "hydrochlorothiazide", "furosemide", "spironolactone",
        // Indonesian terms
        "obat", "tablet", "kapsul", "sirup", "vitamin", "suplemen",
        // Specific patterns
        "mg", "ml", "gram"
      ];

      // Look for medication names (usually after "obat" or before "mg/ml")
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // If word contains medication keyword, get the context
        if (medicationKeywords.some(keyword => word.includes(keyword))) {
          // If it's "obat", look for the next word as medication name
          if (word.includes("obat") && i + 1 < words.length) {
            return words[i + 1].charAt(0).toUpperCase() + words[i + 1].slice(1);
          }
          // If it's a specific medication, return it
          if (!word.includes("obat") && !word.includes("mg") && !word.includes("ml")) {
            return word.charAt(0).toUpperCase() + word.slice(1);
          }
        }
      }

      // Fallback to current medication name if available, otherwise "Obat"
      return currentMedicationName || "Obat";
    }

    // Update the reminder schedule
    const updatedReminderResult = await db
      .update(reminderSchedules)
      .set({
        scheduledTime: reminderTime,
        customMessage: customMessage,
        medicationName: extractMedicationName(customMessage, reminderSchedule.medicationName),
        updatedAt: getWIBTime(),
      })
      .where(eq(reminderSchedules.id, id))
      .returning({
        id: reminderSchedules.id,
        scheduledTime: reminderSchedules.scheduledTime,
        customMessage: reminderSchedules.customMessage,
        medicationName: reminderSchedules.medicationName,
      });

    const updatedReminder = updatedReminderResult[0];

    // Handle content attachment updates
    if (attachedContent !== undefined) {
      // First, remove existing attachments
      await db
        .delete(reminderContentAttachments)
        .where(eq(reminderContentAttachments.reminderScheduleId, id));

      // Add new attachments if any
      if (validatedContent.length > 0) {
        const attachmentRecords = validatedContent.map((content, index) => ({
          reminderScheduleId: id,
          contentType: content.type,
          contentId: content.id,
          contentTitle: content.title,
          contentUrl: content.url,
          attachmentOrder: index + 1,
          createdBy: user.id,
        }));

        await db.insert(reminderContentAttachments).values(attachmentRecords);
      }
    }

    return NextResponse.json({
      message: "Reminder updated successfully",
      reminder: {
        id: updatedReminder.id,
        scheduledTime: updatedReminder.scheduledTime,
        customMessage: updatedReminder.customMessage,
        medicationName: updatedReminder.medicationName,
        attachedContent: validatedContent,
      },
    });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if reminder exists
    const reminderScheduleResult = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.id, id))
      .limit(1);

    if (reminderScheduleResult.length === 0) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const reminder = reminderScheduleResult[0];

    // Soft delete by setting deletedAt timestamp
    await db
      .update(reminderSchedules)
      .set({
        deletedAt: getWIBTime(),
        isActive: false,
        updatedAt: getWIBTime(),
      })
      .where(eq(reminderSchedules.id, id));

    return NextResponse.json({
      success: true,
      message: "Reminder berhasil dihapus",
      deletedReminder: {
        id: reminder.id,
        medicationName: reminder.medicationName,
        scheduledTime: reminder.scheduledTime,
      },
    });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Content validation function
async function validateContentAttachments(
  attachedContent: Array<{
    id: string;
    type: "article" | "video" | "ARTICLE" | "VIDEO";
    title: string;
  }>
) {
  const validatedContent: Array<{
    id: string;
    type: "article" | "video";
    title: string;
    url: string;
  }> = [];

  for (const content of attachedContent) {
    if (!content.id || !content.type || !content.title) {
      continue; // Skip invalid content
    }

    // Normalize the content type to lowercase
    const normalizedType = content.type.toLowerCase() as "article" | "video";

    try {
      if (normalizedType === "article") {
        const articleResult = await db
          .select({ slug: cmsArticles.slug, title: cmsArticles.title })
          .from(cmsArticles)
          .where(
            and(
              eq(cmsArticles.id, content.id),
              eq(cmsArticles.status, "published"),
              isNull(cmsArticles.deletedAt)
            )
          )
          .limit(1);

        if (articleResult.length > 0) {
          validatedContent.push({
            id: content.id,
            type: "article",
            title: articleResult[0].title,
            url: `${
              process.env.NEXT_PUBLIC_BASE_URL ||
              "https://palliative-monitor.vercel.app"
            }/content/articles/${articleResult[0].slug}`,
          });
        }
      } else if (normalizedType === "video") {
        const videoResult = await db
          .select({ slug: cmsVideos.slug, title: cmsVideos.title })
          .from(cmsVideos)
          .where(
            and(
              eq(cmsVideos.id, content.id),
              eq(cmsVideos.status, "published"),
              isNull(cmsVideos.deletedAt)
            )
          )
          .limit(1);

        if (videoResult.length > 0) {
          validatedContent.push({
            id: content.id,
            type: "video",
            title: videoResult[0].title,
            url: `${
              process.env.NEXT_PUBLIC_BASE_URL ||
              "https://palliative-monitor.vercel.app"
            }/content/videos/${videoResult[0].slug}`,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to validate content ${content.id}:`, error);
      continue;
    }
  }

  return validatedContent;
}
