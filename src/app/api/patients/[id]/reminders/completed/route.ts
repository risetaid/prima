import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminders } from "@/db";
import { eq, and, isNotNull, or, desc } from "drizzle-orm";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { logger } from "@/lib/logger";

interface CompletedReminder {
  id: string;
  scheduledTime: string;
  completedDate: string;
  customMessage?: string;
  medicationTaken: boolean;
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
    // Consider a reminder "completed" if it has been sent and/or has a confirmation status
    const completedReminders = await db
      .select({
        id: reminders.id,
        scheduledTime: reminders.scheduledTime,
        completedDate: reminders.startDate, // Using startDate as completedDate for now
        customMessage: reminders.message,
        confirmationStatus: reminders.confirmationStatus,
        confirmedAt: reminders.confirmationResponseAt,
        sentAt: reminders.sentAt,
        notes: reminders.confirmationResponse,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patientId),
          or(
            isNotNull(reminders.sentAt), // Has been sent
            isNotNull(reminders.confirmationResponseAt) // Has been responded to
          ),
          eq(reminders.isActive, true)
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
        medicationTaken: reminder.confirmationStatus === 'CONFIRMED',
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