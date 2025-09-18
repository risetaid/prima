import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  db,
  reminders,
  patients,
  manualConfirmations,
} from "@/db";
import { eq, and, desc, asc, gte, lte, inArray, isNull } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Extract pagination and date filter parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const dateFilter = searchParams.get("date");
    const offset = (page - 1) * limit;

    // Build conditions array with soft delete filter
    const conditions = [
      eq(reminders.patientId, id),
      eq(reminders.isActive, true),
      isNull(reminders.deletedAt), // Critical: soft delete filter
    ];

    // Add date range filter if provided for startDate - use consistent timezone logic
    if (dateFilter) {
      // Use the same helper function as cron and instant send for consistency
      function createWIBDateRange(dateString: string) {
        const date = new Date(dateString);
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(17, 0, 0, 0); // 17:00 UTC = 00:00 WIB (UTC+7)

        const endOfDay = new Date(date);
        endOfDay.setUTCHours(16, 59, 59, 999); // 16:59 UTC next day = 23:59 WIB (UTC+7)
        endOfDay.setDate(endOfDay.getDate() + 1);

        return { startOfDay, endOfDay };
      }

      const { startOfDay, endOfDay } = createWIBDateRange(dateFilter);
      conditions.push(
        gte(reminders.startDate, startOfDay),
        lte(reminders.startDate, endOfDay)
      );
    }

    // Build base query for scheduled reminders
    const baseQuery = db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        endDate: reminders.endDate,
        customMessage: reminders.message,
        isActive: reminders.isActive,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
      })
      .from(reminders)
      .where(and(...conditions));

    // Execute query with pagination
    const scheduledReminders = await baseQuery
      .orderBy(asc(reminders.startDate))
      .limit(limit)
      .offset(offset);

    // Get patient details for reminders
    const patientIds = [...new Set(scheduledReminders.map((r) => r.patientId))];
    const patientDetails =
      patientIds.length > 0
        ? await db
            .select({
              id: patients.id,
              name: patients.name,
              phoneNumber: patients.phoneNumber,
            })
            .from(patients)
            .where(inArray(patients.id, patientIds))
        : [];

    // Get reminder logs for debugging (latest 5 per reminder)
    const reminderIds = scheduledReminders.map((r) => r.id);
    const recentLogs =
      reminderIds.length > 0
        ? await db
            .select({
              id: reminders.id,
              status: reminders.status,
              sentAt: reminders.sentAt,
            })
            .from(reminders)
            .where(inArray(reminders.id, reminderIds))
            .orderBy(desc(reminders.sentAt))
            .limit(reminderIds.length * 5)
        : [];

    // Get manual confirmations for the filtering logic
    const allConfirmations =
      reminderIds.length > 0
        ? await db
            .select({
              id: manualConfirmations.id,
              reminderId: manualConfirmations.reminderId,
            })
            .from(manualConfirmations)
            .where(inArray(manualConfirmations.reminderId, reminderIds))
        : [];

    // Get content attachments for reminders (from medicationDetails JSON)
    const contentAttachments =
      reminderIds.length > 0
        ? await db
            .select({
              id: reminders.id,
              medicationDetails: reminders.medicationDetails,
            })
            .from(reminders)
            .where(inArray(reminders.id, reminderIds))
        : [];

    // Create lookup maps
    const patientMap = new Map();
    patientDetails.forEach((patient) => {
      patientMap.set(patient.id, patient);
    });

    const logsMap = new Map();
    recentLogs.forEach((log) => {
      if (!logsMap.has(log.id)) {
        logsMap.set(log.id, []);
      }
      logsMap.get(log.id).push(log);
    });

    const contentAttachmentsMap = new Map();
    contentAttachments.forEach((attachment) => {
      if (!contentAttachmentsMap.has(attachment.id)) {
        contentAttachmentsMap.set(attachment.id, []);
      }
      // Extract attachments from medicationDetails JSON
      const medicationDetails = attachment.medicationDetails as Record<string, unknown> | null;
      if (medicationDetails?.attachments && Array.isArray(medicationDetails.attachments)) {
        medicationDetails.attachments.forEach((content: Record<string, unknown>, index: number) => {
          contentAttachmentsMap.get(attachment.id).push({
            id: String(content.id || ''),
            type: String(content.type || ''),
            title: String(content.title || ''),
            url: `/content/${String(content.type || '')}s/${String(content.id || '')}`,
            slug: String(content.id || ''),
            order: index + 1,
          });
        });
      }
    });

    // Filter reminders using the same logic as the stats API
    const filteredReminders = scheduledReminders.filter((reminder) => {
      const logs = logsMap.get(reminder.id) || [];

      // For each log, determine its status using the same logic as the stats API
      if (logs.length === 0) {
        // No logs yet - this should be counted as terjadwal
        return true;
      }

      // Evaluate all logs to determine if reminder should be shown in scheduled
      let showInScheduled = false;

      for (const log of logs) {
        // Type guard for confirmation objects
        const logConfirmation = allConfirmations.find(
          (conf) => conf.reminderId === log.id
        );

        if (logConfirmation) {
          // Log has been confirmed - don't show in scheduled
          showInScheduled = false;
        } else if (["SENT", "DELIVERED"].includes(log.status)) {
          // Log sent but not confirmed - don't show in scheduled
          showInScheduled = false;
        } else if (log.status === "FAILED") {
          // Log failed - show in scheduled for retry
          showInScheduled = true;
        } else {
          // Unknown status - treat as scheduled
          showInScheduled = true;
        }
      }

      return showInScheduled;
    });
    console.log(
      `Filter results: ${scheduledReminders.length} total, ${filteredReminders.length} after filtering`
    );

    // Get medication details for all reminders
    const medicationDetailsMap = new Map();
    for (const reminder of filteredReminders) {
      try {
        // Get medication details from reminder (new schema approach)
        // Parse medication details - disabled since MedicationParser was removed
        const parsedMedicationDetails = null;
        medicationDetailsMap.set(reminder.id, parsedMedicationDetails);
      } catch (error) {
        console.warn(
          `Failed to get medication details for reminder ${reminder.id}:`,
          error
        );
        medicationDetailsMap.set(reminder.id, null);
      }
    }

    // Transform to match frontend interface
    const formattedReminders = filteredReminders.map((reminder) => ({
      id: reminder.id,
      scheduledTime: reminder.scheduledTime,
      nextReminderDate: reminder.startDate.toISOString().split("T")[0],
      customMessage: reminder.customMessage,
      patient: patientMap.get(reminder.patientId) || null,
      reminderLogs: logsMap.get(reminder.id) || [],
      attachedContent: contentAttachmentsMap.get(reminder.id) || [],
      medicationDetails: medicationDetailsMap.get(reminder.id) || null,
    }));

    return NextResponse.json(formattedReminders);
  } catch {
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
    const { reminderIds } = await request.json();

    if (!reminderIds || !Array.isArray(reminderIds)) {
      return NextResponse.json(
        { error: "Invalid reminderIds" },
        { status: 400 }
      );
    }

    // Soft delete multiple scheduled reminders by setting deletedAt timestamp
    const deleteResult = await db
      .update(reminders)
      .set({
        deletedAt: getWIBTime(),
        isActive: false,
        updatedAt: getWIBTime(),
      })
      .where(
        and(
          inArray(reminders.id, reminderIds),
          eq(reminders.patientId, id),
          eq(reminders.isActive, true)
        )
      )
      .returning({
        id: reminders.id,
      });

    // Invalidate cache after bulk deletion
    await invalidateCache(CACHE_KEYS.reminderStats(id));

    return NextResponse.json({
      success: true,
      message: "Reminders berhasil dihapus",
      deletedCount: deleteResult.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
