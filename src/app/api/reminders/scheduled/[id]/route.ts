import { createApiHandler } from "@/lib/api-helpers";
import { CACHE_KEYS, del } from "@/lib/cache";
import { ReminderService } from "@/services/reminder/reminder.service";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid reminder ID format"),
});

const updateBodySchema = z.object({
  reminderTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  customMessage: z.string().default(""),
  attachedContent: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(["article", "video", "ARTICLE", "VIDEO"]),
        slug: z.string().optional(),
      })
    )
    .optional(),
});

const reminderService = new ReminderService();

export const PUT = createApiHandler(
  { auth: "required", params: paramsSchema, body: updateBodySchema },
  async (body, { user, params }) => {
    const reminderId = params!.id;
    const typedBody = body as z.infer<typeof updateBodySchema>;

    const updated = await reminderService.updateReminder(
      reminderId,
      {
        reminderTime: typedBody.reminderTime,
        customMessage: typedBody.customMessage,
        attachedContent: typedBody.attachedContent,
      },
      user!.id,
      user!.role
    );

    await del(CACHE_KEYS.reminderStats(updated.patientId));

    return updated;
  }
);

export const DELETE = createApiHandler(
  { auth: "required", params: paramsSchema },
  async (_, { user, params }) => {
    const reminderId = params!.id;

    // Fetch the reminder first so we can invalidate stats after deletion
    const reminder = await reminderService.getReminder(
      reminderId,
      user!.id,
      user!.role
    );

    const result = await reminderService.deleteReminder(
      reminderId,
      user!.id,
      user!.role
    );

    await del(CACHE_KEYS.reminderStats(reminder.patientId));

    return result;
  }
);
