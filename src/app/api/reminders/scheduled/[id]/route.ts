import { createApiHandler } from "@/lib/api-helpers";
import { db, reminders } from "@/db";
import { eq } from "drizzle-orm";
import { getWIBTime } from "@/lib/datetime";

import { invalidateReminderCache } from "@/lib/cache";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { z } from "zod";

const updateReminderBodySchema = z.object({
  reminderTime: z.string().min(1, "Reminder time is required"),
  customMessage: z.string().min(1, "Custom message is required"),
  attachedContent: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(["ARTICLE", "VIDEO"]),
  })).optional(),
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



    // Find the reminder
    const reminderResult = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        scheduledTime: reminders.scheduledTime,
        message: reminders.message,
      })
      .from(reminders)
      .where(eq(reminders.id, id))
      .limit(1);

    if (reminderResult.length === 0) {
      throw new Error("Reminder not found");
    }

    const patientId = reminderResult[0].patientId;

    // Check role-based access to this patient's reminder
    await requirePatientAccess(
      context.user!.id,
      context.user!.role,
      patientId,
      "update this patient's reminder"
    );

    // Update the reminder
    const updatedReminderResult = await db
      .update(reminders)
      .set({
        scheduledTime: reminderTime,
        message: customMessage,
        metadata: attachedContent && attachedContent.length > 0 ? { attachedContent } : null,
        updatedAt: getWIBTime(),
      })
      .where(eq(reminders.id, id))
      .returning({
        id: reminders.id,
        scheduledTime: reminders.scheduledTime,
        message: reminders.message,
      });

    const updatedReminder = updatedReminderResult[0];

    // Invalidate cache after update
    await invalidateReminderCache(patientId);

    return {
      message: "Reminder updated successfully",
      reminder: {
        id: updatedReminder.id,
        scheduledTime: updatedReminder.scheduledTime,
        customMessage: updatedReminder.message,
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
    const reminderResult = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        scheduledTime: reminders.scheduledTime,
      })
      .from(reminders)
      .where(eq(reminders.id, id))
      .limit(1);

    if (reminderResult.length === 0) {
      throw new Error("Reminder not found");
    }

    const reminder = reminderResult[0];

    // Check role-based access to this patient's reminder
    await requirePatientAccess(
      context.user!.id,
      context.user!.role,
      reminder.patientId,
      "delete this patient's reminder"
    );

    // Soft delete by setting deletedAt timestamp
    await db
      .update(reminders)
      .set({
        deletedAt: getWIBTime(),
        isActive: false,
        updatedAt: getWIBTime(),
      })
      .where(eq(reminders.id, id));

    // Invalidate cache after deletion
    await invalidateReminderCache(reminder.patientId);

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
