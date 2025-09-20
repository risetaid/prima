import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminders } from "@/db";
import { eq, and, isNotNull, isNull, or, desc } from "drizzle-orm";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { logger } from "@/lib/logger";

interface CompletedReminder {
  id: string;
  scheduledTime: string;
  completedDate: string;
  customMessage?: string;
  confirmationStatus?: string;
  confirmedAt: string;
  sentAt: string | null;
  notes?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId } = await params;

    // Check patient access control
    await requirePatientAccess(
      user.id,
      user.role,
      patientId,
      "view this patient's completed reminders"
    );

    // Fetch completed reminders using the existing reminders table
    // Consider a reminder "completed" if it has been confirmed (manually or automatically)
    const completedReminders = await db
      .select({
        id: reminders.id,
        scheduledTime: reminders.scheduledTime,
        completedDate: reminders.startDate, // Using startDate as completedDate for now
        customMessage: reminders.message,
        confirmationStatus: reminders.confirmationStatus,
        confirmedAt: reminders.confirmationResponseAt,
        sentAt: reminders.sentAt,
        confirmationResponse: reminders.confirmationResponse,
        notes: reminders.confirmationResponse,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patientId),
          // Only include reminders that have been confirmed
          or(
            eq(reminders.confirmationStatus, "CONFIRMED"),
            isNotNull(reminders.confirmationResponse)
          ),
          // Must be active and not deleted
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      )
      .orderBy(desc(reminders.startDate))
      .limit(50); // Limit to prevent excessive data loading

    // Transform the data to match the expected interface
    const transformedReminders: CompletedReminder[] = completedReminders.map(
      (reminder) => ({
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
        completedDate: reminder.completedDate.toISOString(),
        customMessage: reminder.customMessage,
        // Determine confirmation status - default to confirmed if we have response
        confirmationStatus: reminder.confirmationStatus || (reminder.confirmationResponse ? 'CONFIRMED' : 'MISSED'),
        confirmedAt: reminder.confirmedAt?.toISOString() || reminder.completedDate.toISOString(),
        sentAt: reminder.sentAt?.toISOString() || null,
        notes: reminder.notes || undefined,
      })
    );

    logger.info('Completed reminders fetched', {
      patientId,
      userId: user.id,
      count: transformedReminders.length,
      operation: 'fetch_completed_reminders'
    });

    return NextResponse.json(transformedReminders);

  } catch (error) {
    logger.error("Error fetching completed reminders", error instanceof Error ? error : new Error(String(error)), {
      operation: 'fetch_completed_reminders'
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}