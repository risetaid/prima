import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { logger } from "@/lib/logger";
import { CompletionCalculationService } from "@/services/reminder/completion-calculation.service";

interface CompletedReminder {
  id: string;
  scheduledTime: string;
  completedDate: string;
  customMessage?: string;
  confirmationStatus?: string;
  confirmedAt: string;
  sentAt: string | null;
  notes?: string | null;
  completionType: 'AUTOMATED' | 'MANUAL' | 'NONE';
  responseSource?: 'PATIENT_TEXT' | 'MANUAL_ENTRY' | 'SYSTEM';
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

    // Get completed reminders using standardized completion logic
    const completedRemindersData = await CompletionCalculationService.getCompletedReminders(
      patientId,
      { limit: 50 }
    );

    // Transform the data to match the expected interface
    const transformedReminders: CompletedReminder[] = completedRemindersData.map(
      (reminder) => ({
        id: reminder.reminderId,
        scheduledTime: reminder.scheduledTime,
        completedDate: reminder.status.confirmedAt?.toISOString() || new Date().toISOString(),
        customMessage: reminder.patientResponse || undefined,
        confirmationStatus: reminder.status.confirmationStatus,
        confirmedAt: reminder.status.confirmedAt?.toISOString() || new Date().toISOString(),
        sentAt: reminder.sentAt?.toISOString() || null,
        notes: reminder.patientResponse || undefined,
        completionType: reminder.status.completionType,
        responseSource: reminder.status.responseSource,
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