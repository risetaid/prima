import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminderLogs, manualConfirmations } from "@/db";
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

    const { confirmed, reminderLogId } = requestBody;
    console.log("📥 Request body:", { confirmed, reminderLogId });

    if (typeof confirmed !== "boolean") {
      console.error(
        "❌ VALIDATION ERROR: confirmed is not boolean:",
        typeof confirmed
      );
      return NextResponse.json(
        { error: "confirmed must be boolean" },
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
      confirmed,
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
    // Reminder schedule details not needed for confirmation

    // Check if this ReminderLog is already manually confirmed
    console.log("🔍 Checking for existing manual confirmation:", { logId });
    const existingManualConfirmation = await db
      .select({
        id: manualConfirmations.id,
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.reminderLogId, logId))
      .limit(1);

    console.log("📊 Existing manual confirmation check:", {
      exists: existingManualConfirmation.length > 0,
      id: existingManualConfirmation[0]?.id,
    });

    if (existingManualConfirmation.length > 0) {
      console.error("❌ REMINDER ALREADY MANUALLY CONFIRMED:", {
        logId,
        existingId: existingManualConfirmation[0].id,
      });
      return NextResponse.json(
        { error: "Reminder already manually confirmed by volunteer" },
        { status: 409 }
      );
    }

    // Check for automated confirmation conflict
    console.log("🔍 Checking for automated confirmation conflict:", { logId });
    const reminderLogData = await db
      .select({
        confirmationStatus: reminderLogs.confirmationStatus,
        confirmationResponse: reminderLogs.confirmationResponse,
        confirmationResponseAt: reminderLogs.confirmationResponseAt,
      })
      .from(reminderLogs)
      .where(eq(reminderLogs.id, logId))
      .limit(1);

    const automatedConfirmation = reminderLogData[0];
    console.log("📊 Automated confirmation check:", {
      status: automatedConfirmation?.confirmationStatus,
      hasResponse: !!automatedConfirmation?.confirmationResponse,
      responseTime: automatedConfirmation?.confirmationResponseAt,
    });

    if (
      automatedConfirmation?.confirmationStatus &&
      automatedConfirmation.confirmationStatus !== "PENDING"
    ) {
      console.error("❌ AUTOMATED CONFIRMATION CONFLICT:", {
        logId,
        automatedStatus: automatedConfirmation.confirmationStatus,
        automatedResponse: automatedConfirmation.confirmationResponse,
      });
      return NextResponse.json(
        {
          error: "Automated confirmation already exists",
          automatedStatus: automatedConfirmation.confirmationStatus,
          automatedResponse: automatedConfirmation.confirmationResponse,
          conflictType: "automated_confirmation_exists",
        },
        { status: 409 }
      );
    }

    console.log(
      "✅ No confirmation conflicts found, proceeding with manual confirmation"
    );

    // Create manual confirmation with proper relations
    console.log("💾 Creating manual confirmation:", {
      patientId: id,
      volunteerId: user.id,
      reminderLogId: logId,
      confirmed,
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
          patientCondition: "FAIR", // Default, could be made dynamic
          symptomsReported: [],
          followUpNeeded: !confirmed,
          followUpNotes: confirmed
            ? null
            : "Patient did not complete scheduled health routine",
        })
        .returning({
          id: manualConfirmations.id,
          patientId: manualConfirmations.patientId,
          volunteerId: manualConfirmations.volunteerId,
          reminderScheduleId: manualConfirmations.reminderScheduleId,
          reminderLogId: manualConfirmations.reminderLogId,
          visitDate: manualConfirmations.visitDate,
          visitTime: manualConfirmations.visitTime,
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
