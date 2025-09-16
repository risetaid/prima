import { createApiHandler } from "@/lib/api-handler";
import { db, reminderSchedules, reminderContentAttachments } from "@/db";
import { eq } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";

import { validateContentAttachments } from "@/lib/content-validation";
import { invalidateAfterReminderOperation } from "@/lib/cache-invalidation";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { z } from "zod";

const updateReminderBodySchema = z.object({
  reminderTime: z.string().min(1, "Reminder time is required"),
  customMessage: z.string().min(1, "Custom message is required"),
  attachedContent: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["article", "video"]),
        title: z.string(),
      })
    )
    .optional(),
});

const updateReminderParamsSchema = z.object({
  id: z.string().uuid("Invalid reminder ID format"),
});

type UpdateReminderBody = z.infer<typeof updateReminderBodySchema>;

export const PUT = createApiHandler(
  {
    auth: "required",
    body: updateReminderBodySchema,
    params: updateReminderParamsSchema,
  },
  async (body: UpdateReminderBody, context) => {
    const { reminderTime, customMessage, attachedContent } = body;
    const { id } = context.params!;

    if (!reminderTime || !customMessage) {
      throw new Error(
        "Missing required fields: reminderTime and customMessage"
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
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.id, id))
      .limit(1);

    if (reminderScheduleResult.length === 0) {
      throw new Error("Reminder not found");
    }

    const patientId = reminderScheduleResult[0].patientId;

    // Check role-based access to this patient's reminder
    await requirePatientAccess(
      context.user.id,
      context.user.role,
      patientId,
      "update this patient's reminder"
    );

    // Update the reminder schedule
    const updatedReminderResult = await db
      .update(reminderSchedules)
      .set({
        scheduledTime: reminderTime,
        customMessage: customMessage,
        updatedAt: getWIBTime(),
      })
      .where(eq(reminderSchedules.id, id))
      .returning({
        id: reminderSchedules.id,
        scheduledTime: reminderSchedules.scheduledTime,
        customMessage: reminderSchedules.customMessage,
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
          createdBy: context.user.id,
        }));

        await db.insert(reminderContentAttachments).values(attachmentRecords);
      }
    }

    // Invalidate cache after update using systematic approach
    await invalidateAfterReminderOperation(patientId, "update");

    return {
      message: "Reminder updated successfully",
      reminder: {
        id: updatedReminder.id,
        scheduledTime: updatedReminder.scheduledTime,
        customMessage: updatedReminder.customMessage,
        attachedContent: validatedContent,
      },
    };
  }
);

export const DELETE = createApiHandler(
  {
    auth: "required",
    params: updateReminderParamsSchema,
  },
  async (body, context) => {
    const { id } = context.params!;

    // Check if reminder exists
    const reminderScheduleResult = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        scheduledTime: reminderSchedules.scheduledTime,
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.id, id))
      .limit(1);

    if (reminderScheduleResult.length === 0) {
      throw new Error("Reminder not found");
    }

    const reminder = reminderScheduleResult[0];

    // Check role-based access to this patient's reminder
    await requirePatientAccess(
      context.user.id,
      context.user.role,
      reminder.patientId,
      "delete this patient's reminder"
    );

    // Soft delete by setting deletedAt timestamp
    await db
      .update(reminderSchedules)
      .set({
        deletedAt: getWIBTime(),
        isActive: false,
        updatedAt: getWIBTime(),
      })
      .where(eq(reminderSchedules.id, id));

    // Invalidate cache after deletion using systematic approach
    await invalidateAfterReminderOperation(reminder.patientId, "delete");

    return {
      success: true,
      message: "Reminder berhasil dihapus",
      deletedReminder: {
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
      },
    };
  }
);
