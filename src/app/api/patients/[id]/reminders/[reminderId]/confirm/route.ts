import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminderLogs, reminderSchedules, manualConfirmations } from "@/db";
import { eq, and } from "drizzle-orm";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    console.log("=== REMINDER CONFIRMATION API CALLED ===");

    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ AUTH ERROR: User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ User authenticated:", user.id);

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("❌ JSON PARSE ERROR:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { medicationTaken, reminderLogId } = requestBody;
    console.log("📥 Request body:", { medicationTaken, reminderLogId });

    if (typeof medicationTaken !== "boolean") {
      console.error(
        "❌ VALIDATION ERROR: medicationTaken is not boolean:",
        typeof medicationTaken
      );
      return NextResponse.json(
        { error: "medicationTaken must be boolean" },
        { status: 400 }
      );
    }

    const { id, reminderId: rawReminderId } = await params;
    console.log("📋 URL params:", { patientId: id, rawReminderId });

    // The reminderId is already a clean UUID from the pending reminders API
    const reminderId = rawReminderId;

    // The reminderLogId should already be a clean UUID
    const extractedLogId = reminderLogId || reminderId;

    const logId = extractedLogId;
    console.log("🔍 Processed IDs:", {
      patientId: id,
      rawReminderId,
      reminderId,
      logId,
      medicationTaken,
    });

    // Get the reminder log using separate queries
    console.log("🔍 Querying reminder log:", { logId, patientId: id });
    const reminderLog = await db
      .select({
        id: reminderLogs.id,
        patientId: reminderLogs.patientId,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        message: reminderLogs.message,
        status: reminderLogs.status,
      })
      .from(reminderLogs)
      .where(and(eq(reminderLogs.id, logId), eq(reminderLogs.patientId, id)))
      .limit(1);

    console.log("📊 Reminder log query result:", {
      found: reminderLog.length > 0,
      data: reminderLog[0],
    });

    if (reminderLog.length === 0) {
      console.error("❌ REMINDER NOT FOUND:", { logId, patientId: id });
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const logData = reminderLog[0];
    console.log("✅ Reminder log found:", logData);

    // Get reminder schedule details (if reminderScheduleId exists)
    let reminderSchedule: {
      id: string;
      medicationName: string;
      dosage: string | null;
    }[] = [];
    if (logData.reminderScheduleId) {
      reminderSchedule = await db
        .select({
          id: reminderSchedules.id,
          medicationName: reminderSchedules.medicationName,
          dosage: reminderSchedules.dosage,
        })
        .from(reminderSchedules)
        .where(eq(reminderSchedules.id, logData.reminderScheduleId))
        .limit(1);
    }

    // Check if this ReminderLog is already confirmed
    console.log("🔍 Checking for existing confirmation:", { logId });
    const existingConfirmation = await db
      .select({
        id: manualConfirmations.id,
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.reminderLogId, logId))
      .limit(1);

    console.log("📊 Existing confirmation check:", {
      exists: existingConfirmation.length > 0,
      id: existingConfirmation[0]?.id,
    });

    if (existingConfirmation.length > 0) {
      console.error("❌ REMINDER ALREADY CONFIRMED:", {
        logId,
        existingId: existingConfirmation[0].id,
      });
      return NextResponse.json(
        { error: "Reminder already confirmed" },
        { status: 400 }
      );
    }
    console.log("✅ No existing confirmation found, proceeding with creation");

    // Create manual confirmation with proper relations
    console.log("💾 Creating manual confirmation:", {
      patientId: id,
      volunteerId: user.id,
      reminderLogId: logId,
      medicationTaken,
    });

    try {
      const newManualConfirmation = await db
        .insert(manualConfirmations)
        .values({
          patientId: id,
          volunteerId: user.id,
          reminderScheduleId: logData.reminderScheduleId,
          reminderLogId: logId, // Link to specific ReminderLog
          visitDate: new Date(),
          visitTime: new Date().toTimeString().slice(0, 5), // HH:MM format
          medicationsTaken: medicationTaken,
          medicationsMissed: medicationTaken
            ? []
            : [
                reminderSchedule && reminderSchedule.length > 0
                  ? reminderSchedule[0].medicationName
                  : "Obat",
              ],
          patientCondition: "FAIR", // Default, could be made dynamic
          symptomsReported: [],
          followUpNeeded: !medicationTaken,
          followUpNotes: medicationTaken
            ? null
            : "Patient did not take medication as scheduled",
        })
        .returning({
          id: manualConfirmations.id,
          patientId: manualConfirmations.patientId,
          volunteerId: manualConfirmations.volunteerId,
          reminderScheduleId: manualConfirmations.reminderScheduleId,
          reminderLogId: manualConfirmations.reminderLogId,
          visitDate: manualConfirmations.visitDate,
          visitTime: manualConfirmations.visitTime,
          medicationsTaken: manualConfirmations.medicationsTaken,
          medicationsMissed: manualConfirmations.medicationsMissed,
          patientCondition: manualConfirmations.patientCondition,
          symptomsReported: manualConfirmations.symptomsReported,
          notes: manualConfirmations.notes,
          followUpNeeded: manualConfirmations.followUpNeeded,
          followUpNotes: manualConfirmations.followUpNotes,
          confirmedAt: manualConfirmations.confirmedAt,
        });

      console.log(
        "✅ Manual confirmation created successfully:",
        newManualConfirmation[0]
      );

      // Invalidate cache after confirmation
      await invalidateCache(CACHE_KEYS.reminderStats(id));
      console.log("🗑️ Cache invalidated for patient:", id);

      console.log("🎉 REMINDER CONFIRMATION COMPLETED SUCCESSFULLY");
      return NextResponse.json(newManualConfirmation[0]);
    } catch (dbError) {
      console.error("❌ DATABASE INSERTION ERROR:", dbError);
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error confirming reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
