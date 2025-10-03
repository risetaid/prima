import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { logger } from "@/lib/logger";
import { db, reminders, manualConfirmations } from "@/db";
import { eq, and, isNull, or, desc, inArray } from "drizzle-orm";

interface CompletedReminder {
  id: string;
  scheduledTime: string;
  reminderDate: string;
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

    // Get completed reminders (confirmed status or manually confirmed)
    const allReminders = await db
      .select({
        id: reminders.id,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        message: reminders.message,
        status: reminders.status,
        confirmationStatus: reminders.confirmationStatus,
        confirmationResponseAt: reminders.confirmationResponseAt,
        confirmationResponse: reminders.confirmationResponse,
        sentAt: reminders.sentAt,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patientId),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt),
          or(
            eq(reminders.confirmationStatus, 'CONFIRMED'),
            eq(reminders.status, 'DELIVERED')
          )
        )
      )
      .orderBy(desc(reminders.confirmationResponseAt))
      .limit(50);

    // Get manual confirmations for these reminders
    const reminderIds = allReminders.map(r => r.id);
    const manualConfs = reminderIds.length > 0
      ? await db
          .select({
            reminderId: manualConfirmations.reminderId,
            confirmedAt: manualConfirmations.confirmedAt,
            notes: manualConfirmations.notes,
          })
          .from(manualConfirmations)
          .where(inArray(manualConfirmations.reminderId, reminderIds))
      : [];

    const manualConfMap = new Map(manualConfs.map(c => [c.reminderId, c]));

    // Transform to expected interface
    const transformedReminders: CompletedReminder[] = allReminders
      .filter(r => r.confirmationStatus === 'CONFIRMED' || manualConfMap.has(r.id))
      .map((reminder) => {
        const manualConf = manualConfMap.get(reminder.id);
        const isManual = !!manualConf;

        return {
          id: reminder.id,
          scheduledTime: reminder.scheduledTime,
          reminderDate: reminder.startDate?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
          customMessage: reminder.message || undefined,
          confirmationStatus: reminder.confirmationStatus || undefined,
          confirmedAt: (manualConf?.confirmedAt || reminder.confirmationResponseAt || new Date()).toISOString(),
          sentAt: reminder.sentAt?.toISOString() || null,
          notes: manualConf?.notes || reminder.confirmationResponse || undefined,
          completionType: (isManual ? 'MANUAL' : 'AUTOMATED') as 'AUTOMATED' | 'MANUAL' | 'NONE',
          responseSource: (isManual ? 'MANUAL_ENTRY' : 'PATIENT_TEXT') as 'PATIENT_TEXT' | 'MANUAL_ENTRY' | 'SYSTEM',
        };
      });

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