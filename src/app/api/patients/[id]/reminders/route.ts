import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { logger } from "@/lib/logger";
import { db, reminders, manualConfirmations, patients } from "@/db";
import { eq, and, isNull, or, desc, asc, gte, lte, inArray, notExists } from "drizzle-orm";
import { getWIBTime } from "@/lib/datetime";
import { del, CACHE_KEYS } from "@/lib/cache";
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/fonnte";
import { shouldSendReminderNow } from "@/lib/datetime";
import { createErrorResponse, handleApiError } from "@/lib/api-helpers";
import { cmsArticles, cmsVideos } from "@/db";

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

type Patient = {
  id: string;
  name: string;
  phoneNumber: string;
  verificationStatus: string;
  isActive: boolean;
};

type CustomRecurrence = {
  frequency: string;
  interval: number;
  occurrences?: number;
  endType?: string;
  endDate?: string;
  daysOfWeek?: string[];
};

type AttachedContent = {
  id: string;
  type: "article" | "video" | "ARTICLE" | "VIDEO";
  title: string;
};

type ValidatedContent = {
  id: string;
  type: "article" | "video";
  title: string;
  url: string;
};

// Helper function to create WIB date range
function createWIBDateRange(dateString: string) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  const startOfDay = new Date(date);
  startOfDay.setUTCHours(17, 0, 0, 0); // 17:00 UTC = 00:00 WIB (UTC+7)

  const endOfDay = new Date(date);
  endOfDay.setUTCHours(16, 59, 59, 999); // 16:59 UTC next day = 23:59 WIB
  endOfDay.setDate(endOfDay.getDate() + 1);

  return { startOfDay, endOfDay };
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
      "view this patient's reminders"
    );

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const dateFilter = searchParams.get("date");
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const offset = (page - 1) * limit;

    // Handle different filter types
    switch (filter) {
      case "completed":
        return await getCompletedReminders(patientId, user.id);
      case "pending":
        return await getPendingReminders(patientId, page, limit, dateFilter);
      case "scheduled":
        return await getScheduledReminders(patientId, page, limit, dateFilter);
      case "all":
      default:
        return await getAllReminders(patientId, includeDeleted, limit, offset);
    }
  } catch (error) {
    logger.error("Error fetching reminders", error instanceof Error ? error : new Error(String(error)), {
      operation: 'fetch_reminders'
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getCompletedReminders(patientId: string, userId: string) {
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
    userId,
    count: transformedReminders.length,
    operation: 'fetch_completed_reminders'
  });

  return NextResponse.json(transformedReminders);
}

async function getPendingReminders(patientId: string, page: number, limit: number, dateFilter: string | null) {
  const offset = (page - 1) * limit;

  // Build where conditions with proper logic - match stats API criteria
  const whereConditions = [
    eq(reminders.patientId, patientId),
    // Match stats API logic: include SENT or DELIVERED reminders
    or(
      eq(reminders.status, "SENT"),
      eq(reminders.status, "DELIVERED")
    ),
    // Include soft delete filter like other APIs
    isNull(reminders.deletedAt),
    eq(reminders.isActive, true),
    // Must not have manual confirmation
    notExists(
      db
        .select()
        .from(manualConfirmations)
        .where(eq(manualConfirmations.reminderId, reminders.id))
    ),
    // Must not be confirmed (manually or automatically)
    // Include reminders that need manual confirmation even if automated response was MISSED
    and(
      or(
        isNull(reminders.confirmationStatus),
        eq(reminders.confirmationStatus, 'PENDING'),
        eq(reminders.confirmationStatus, 'MISSED')
      ),
      isNull(reminders.confirmationResponse)
    ),
  ];

  // Add date range filter if provided - use consistent timezone logic
  if (dateFilter) {
    try {
      const { startOfDay, endOfDay } = createWIBDateRange(dateFilter);
      whereConditions.push(gte(reminders.sentAt, startOfDay));
      whereConditions.push(lte(reminders.sentAt, endOfDay));
    } catch (dateError: unknown) {
      logger.error("Error in date filtering:", dateError instanceof Error ? dateError : new Error(String(dateError)));
      // Continue without date filter if there's an error
    }
  }

  // Get reminders that are SENT but don't have manual confirmation yet
  const pendingReminders = await db
    .select({
      id: reminders.id,
      sentAt: reminders.sentAt,
      // Automated confirmation fields
      confirmationStatus: reminders.confirmationStatus,
      confirmationResponse: reminders.confirmationResponse,
      confirmationResponseAt: reminders.confirmationResponseAt,
      confirmationSentAt: reminders.confirmationSentAt,
      // Schedule fields from reminders table
      scheduledTime: reminders.scheduledTime,
      customMessage: reminders.message,
    })
    .from(reminders)
    .where(and(...whereConditions))
    .orderBy(desc(reminders.sentAt))
    .offset(offset)
    .limit(limit);

  // Transform to match frontend interface
  const formattedReminders = pendingReminders.map((reminder) => ({
    id: reminder.id,
    scheduledTime: reminder.scheduledTime || "12:00",
    reminderDate: reminder.sentAt ? reminder.sentAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    customMessage: reminder.customMessage,
    status: "PENDING_UPDATE",
    // Include automated confirmation fields for UI to handle properly
    confirmationStatus: reminder.confirmationStatus,
    confirmationResponse: reminder.confirmationResponse,
    confirmationResponseAt: reminder.confirmationResponseAt,
    confirmationSentAt: reminder.confirmationSentAt,
  }));

  return NextResponse.json(formattedReminders);
}

async function getScheduledReminders(patientId: string, page: number, limit: number, dateFilter: string | null) {
  const offset = (page - 1) * limit;

  // Build conditions array with soft delete filter
  const conditions = [
    eq(reminders.patientId, patientId),
    eq(reminders.isActive, true),
    isNull(reminders.deletedAt), // Critical: soft delete filter
  ];

  // Add date range filter if provided for startDate - use consistent timezone logic
  if (dateFilter) {
    try {
      const { startOfDay, endOfDay } = createWIBDateRange(dateFilter);
      conditions.push(
        gte(reminders.startDate, startOfDay),
        lte(reminders.startDate, endOfDay)
      );
    } catch (dateError: unknown) {
      logger.error("Error in date filtering:", dateError instanceof Error ? dateError : new Error(String(dateError)));
    }
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
      metadata: reminders.metadata,
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

  // Content attachments map - extract from metadata
  const contentAttachmentsMap = new Map();
  scheduledReminders.forEach((reminder) => {
    const metadata = reminder.metadata as { attachedContent?: unknown[] } | null;
    if (metadata?.attachedContent && Array.isArray(metadata.attachedContent)) {
      contentAttachmentsMap.set(reminder.id, metadata.attachedContent);
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

  logger.info(
    `Filter results: ${scheduledReminders.length} total, ${filteredReminders.length} after filtering`
  );

  // Transform to match frontend interface
  const formattedReminders = filteredReminders.map((reminder) => ({
    id: reminder.id,
    scheduledTime: reminder.scheduledTime,
    nextReminderDate: reminder.startDate.toISOString().split("T")[0],
    customMessage: reminder.customMessage,
    patient: patientMap.get(reminder.patientId) || null,
    reminderLogs: logsMap.get(reminder.id) || [],
    attachedContent: contentAttachmentsMap.get(reminder.id) || [],
  }));

  return NextResponse.json(formattedReminders);
}

async function getAllReminders(patientId: string, includeDeleted: boolean, limit: number, offset: number) {
  // Build the where condition
  const whereCondition = includeDeleted
    ? eq(reminders.patientId, patientId)
    : and(
        eq(reminders.patientId, patientId),
        isNull(reminders.deletedAt)
      );

  // Get all reminders for patient with patient info
  const patientReminders = await db
    .select({
      // Reminder fields
      id: reminders.id,
      patientId: reminders.patientId,
      reminderType: reminders.reminderType,
      scheduledTime: reminders.scheduledTime,
      message: reminders.message,
      startDate: reminders.startDate,
      endDate: reminders.endDate,
      isActive: reminders.isActive,
      status: reminders.status,
      confirmationStatus: reminders.confirmationStatus,
      sentAt: reminders.sentAt,
      confirmationResponseAt: reminders.confirmationResponseAt,
      confirmationResponse: reminders.confirmationResponse,
      title: reminders.title,
      description: reminders.description,
      priority: reminders.priority,
      createdById: reminders.createdById,
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      deletedAt: reminders.deletedAt,
      // Patient fields
      patientName: patients.name,
      patientPhoneNumber: patients.phoneNumber,
    })
    .from(reminders)
    .leftJoin(patients, eq(reminders.patientId, patients.id))
    .where(whereCondition)
    .orderBy(desc(reminders.createdAt));

  // Apply pagination if specified
  const paginatedReminders = limit ? patientReminders.slice(offset, offset + limit) : patientReminders;

  // Format response to match expected structure
  const formattedReminders = paginatedReminders.map((reminder) => ({
    id: reminder.id,
    patientId: reminder.patientId,
    reminderType: reminder.reminderType,
    scheduledTime: reminder.scheduledTime,
    message: reminder.message,
    startDate: reminder.startDate,
    endDate: reminder.endDate,
    isActive: reminder.isActive,
    status: reminder.status,
    confirmationStatus: reminder.confirmationStatus,
    sentAt: reminder.sentAt,
    confirmationResponseAt: reminder.confirmationResponseAt,
    confirmationResponse: reminder.confirmationResponse,
    title: reminder.title,
    description: reminder.description,
    priority: reminder.priority,
    createdById: reminder.createdById,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
    deletedAt: reminder.deletedAt,
    patient: {
      name: reminder.patientName,
      phoneNumber: reminder.patientPhoneNumber,
    },
  }));

  // Include pagination metadata if pagination is requested
  const response = {
    reminders: formattedReminders,
    total: patientReminders.length,
    ...(limit && {
      pagination: {
        limit,
        offset,
        remaining: Math.max(0, patientReminders.length - (offset + limit))
      }
    })
  };

  return NextResponse.json(response);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse(
        "Unauthorized",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    const { id } = await params;

    // Check role-based access to this patient
    await requirePatientAccess(
      user.id,
      user.role,
      id,
      "create reminders for this patient"
    );

    const requestBody = await request.json();

    // Verify patient exists and get phone number
    const patientResult = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        verificationStatus: patients.verificationStatus,
        isActive: patients.isActive,
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (patientResult.length === 0) {
      return createErrorResponse(
        "Patient not found",
        404,
        undefined,
        "NOT_FOUND_ERROR"
      );
    }

    const patient = patientResult[0];

    // Validate input and generate schedules data
    const { message, time, datesToSchedule, validatedContent } =
      await validateReminderInput(requestBody, patient);

    // Create reminder schedules
    const createdSchedules = await createReminderSchedules(
      id,
      message,
      time,
      datesToSchedule,
      validatedContent,
      user.id
    );

    // Handle immediate reminders if any should be sent now
    await sendImmediateReminders(createdSchedules, patient, message, validatedContent, time);

    return NextResponse.json({
      message: "Reminders created successfully",
      count: createdSchedules.length,
      schedules: createdSchedules.map((s) => ({
        id: s.id,
        startDate: s.startDate,
        scheduledTime: s.scheduledTime,
      })),
      recurrenceType: "manual", // Simplified for now
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return createErrorResponse(
        error.message,
        400,
        error.details,
        "VALIDATION_ERROR"
      );
    }
    if (error instanceof PatientVerificationError) {
      return createErrorResponse(
        error.message,
        403,
        error.details,
        "PATIENT_NOT_VERIFIED"
      );
    }
    return handleApiError(error, "creating patient reminders");
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
    await del(CACHE_KEYS.reminderStats(id));

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

class ValidationError extends Error {
  details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

class PatientVerificationError extends Error {
  details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "PatientVerificationError";
    this.details = details;
  }
}

async function validateReminderInput(requestBody: { message: string; time: string; selectedDates?: string[]; customRecurrence?: CustomRecurrence; attachedContent?: AttachedContent[] }, patient: Patient) {
  const { message, time, selectedDates, customRecurrence, attachedContent } = requestBody;

  if (!message || !time) {
    throw new ValidationError("Missing required fields: message and time");
  }

  let datesToSchedule: string[] = [];

  // Validate input based on recurrence type
  if (customRecurrence) {
    if (!customRecurrence.frequency || !customRecurrence.interval) {
      throw new ValidationError("Invalid custom recurrence configuration");
    }

    // Prevent infinite loop - interval must be positive
    if (customRecurrence.interval <= 0) {
      throw new ValidationError("Recurrence interval must be greater than 0");
    }

    // Prevent excessive occurrences
    if (customRecurrence.occurrences && customRecurrence.occurrences > 1000) {
      throw new ValidationError("Maximum 1000 occurrences allowed");
    }

    datesToSchedule = generateRecurrenceDates(customRecurrence);
  } else {
    if (!selectedDates || !Array.isArray(selectedDates) || selectedDates.length === 0) {
      throw new ValidationError("Missing required field: selectedDates");
    }
    datesToSchedule = selectedDates;
  }

  // Enforce verification before allowing reminder creation
  if (patient.verificationStatus !== 'VERIFIED' || !patient.isActive) {
    throw new PatientVerificationError(
      'Patient must be verified and active to create reminders',
      {
        verificationStatus: patient.verificationStatus,
        isActive: patient.isActive,
      }
    );
  }

  // Validate attached content if provided
  let validatedContent: Array<{
    id: string;
    type: "article" | "video";
    title: string;
    url: string;
  }> = [];
  if (attachedContent && Array.isArray(attachedContent) && attachedContent.length > 0) {
    validatedContent = await validateContentAttachments(attachedContent);
    if (validatedContent.length === 0) {
      throw new ValidationError("None of the selected content items are valid or published");
    }
  }

  return { message, time, datesToSchedule, validatedContent };
}

async function createReminderSchedules(
  patientId: string,
  message: string,
  time: string,
  datesToSchedule: string[],
  validatedContent: ValidatedContent[],
  userId: string
) {
  const createdSchedules = [];

  for (const dateString of datesToSchedule) {
    const reminderDate = new Date(dateString);

    // Validate date is not invalid
    if (isNaN(reminderDate.getTime())) {
      continue; // Skip invalid dates
    }

    const reminderResult = await db
      .insert(reminders)
      .values({
        patientId,
        scheduledTime: time,
        reminderType: "GENERAL", // Default type
        message: message,
        startDate: reminderDate,
        endDate: reminderDate, // Each reminder has its own single date
        isActive: true,
        createdById: userId,
        metadata: validatedContent.length > 0 ? { attachedContent: validatedContent } : null,
      })
      .returning();

    const reminder = reminderResult[0];

    createdSchedules.push(reminder);

  }

  return createdSchedules;
}

async function sendImmediateReminders(
  createdSchedules: Array<{
    id: string;
    startDate: Date;
    [key: string]: unknown;
  }>,
  patient: Patient,
  message: string,
  validatedContent: ValidatedContent[],
  time: string
) {
  // Check if any of today's reminders should be sent now
  for (const schedule of createdSchedules) {
    const scheduleDate = schedule.startDate.toISOString().split("T")[0];

    if (shouldSendReminderNow(scheduleDate, time)) {
      // Generate enhanced message with content attachments and template replacement
      const enhancedMessage = generateEnhancedMessage(message, validatedContent, patient.name);

      // Send via Fonnte
      const result = await sendWhatsAppMessage({
        to: formatWhatsAppNumber(patient.phoneNumber),
        body: enhancedMessage,
      });

      // Update reminder with sent status
      const status: "SENT" | "FAILED" = result.success ? "SENT" : "FAILED";

      await db.update(reminders).set({
        sentAt: getWIBTime(),
        status: status,
        fonnteMessageId: result.messageId,
        updatedAt: getWIBTime(),
      }).where(eq(reminders.id, schedule.id));

      // Invalidate cache after creating reminder log
      await del(CACHE_KEYS.reminderStats(patient.id));

      break; // Only send one immediate reminder
    }
  }
}

function generateRecurrenceDates(customRecurrence: CustomRecurrence): string[] {
  const dates: string[] = [];
  const today = new Date();
  const startDate = new Date(today);

  // Calculate end date based on end type
  let endDate: Date;
  if (customRecurrence.endType === "never") {
    // Generate for next 365 days (1 year)
    endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else if (customRecurrence.endType === "on" && customRecurrence.endDate) {
    endDate = new Date(customRecurrence.endDate);
  } else if (
    customRecurrence.endType === "after" &&
    customRecurrence.occurrences
  ) {
    // We'll calculate this dynamically
    endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1); // Temporary end date
  } else {
    // Default to 30 days
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
  }

  const currentDate = new Date(startDate);
  let occurrenceCount = 0;
  // Safe type coercion to prevent string/invalid numbers
  const maxOccurrences =
    customRecurrence.endType === "after"
      ? Math.max(1, customRecurrence.occurrences || 1) // Ensure positive integer
      : 1000;

  // Add safety counter to prevent infinite loops and memory issues
  let loopCounter = 0;
  const maxLoops = 10000; // Safety limit

  while (
    currentDate <= endDate &&
    occurrenceCount < maxOccurrences &&
    loopCounter < maxLoops
  ) {
    loopCounter++;
    let shouldInclude = false;

    if (customRecurrence.frequency === "day") {
      shouldInclude = true;
    } else if (customRecurrence.frequency === "week") {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const currentDayName = dayNames[dayOfWeek];

      // Safe array access with bounds check
      if (
        customRecurrence.daysOfWeek &&
        Array.isArray(customRecurrence.daysOfWeek)
      ) {
        shouldInclude = customRecurrence.daysOfWeek.includes(currentDayName);
      } else {
        // Default to current day if daysOfWeek is invalid
        shouldInclude = true;
      }
    } else if (customRecurrence.frequency === "month") {
      // For monthly, include if it's the same day of month as start date
      shouldInclude = currentDate.getDate() === startDate.getDate();
    }

    if (shouldInclude) {
      dates.push(currentDate.toISOString().split("T")[0]);
      occurrenceCount++;
    }

    // Move to next date based on frequency and interval
    if (customRecurrence.frequency === "day") {
      currentDate.setDate(currentDate.getDate() + customRecurrence.interval);
    } else if (customRecurrence.frequency === "week") {
      currentDate.setDate(currentDate.getDate() + 1); // Check every day for weekly
    } else if (customRecurrence.frequency === "month") {
      currentDate.setMonth(currentDate.getMonth() + customRecurrence.interval);
    }
  }

  return dates;
}

// Helper function to validate content attachments
async function validateContentAttachments(
  attachedContent: Array<{
    id: string;
    type: "article" | "video" | "ARTICLE" | "VIDEO";
    title: string;
  }>
) {
  logger.info("Starting content attachment validation", {
    api: true,
    patients: true,
    reminders: true,
    contentCount: attachedContent.length,
  });

  const validatedContent: Array<{
    id: string;
    type: "article" | "video";
    title: string;
    url: string;
  }> = [];

  for (const content of attachedContent) {
    if (!content.id || !content.type || !content.title) {
      logger.warn("Skipping invalid content attachment", {
        api: true,
        patients: true,
        reminders: true,
        contentId: content.id,
        hasId: !!content.id,
        hasType: !!content.type,
        hasTitle: !!content.title,
      });
      continue; // Skip invalid content
    }

    // Normalize the content type to lowercase
    const normalizedType = content.type.toLowerCase() as "article" | "video";

    try {
      if (normalizedType === "article") {
        const articleResult = await db
          .select({ slug: cmsArticles.slug, title: cmsArticles.title })
          .from(cmsArticles)
          .where(
            and(
              eq(cmsArticles.id, content.id),
              eq(cmsArticles.status, "PUBLISHED"),
              isNull(cmsArticles.deletedAt)
            )
          )
          .limit(1);

        if (articleResult.length > 0) {
          validatedContent.push({
            id: content.id,
            type: "article",
            title: articleResult[0].title,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${articleResult[0].slug}`,
          });

          logger.debug("Article content validated successfully", {
            api: true,
            contentId: content.id,
            title: articleResult[0].title,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${articleResult[0].slug}`,
          });
        } else {
          logger.warn(
            "Article content validation failed - not found or not published",
            {
              api: true,
              contentId: content.id,
              title: content.title,
            }
          );
        }
      } else if (normalizedType === "video") {
        const videoResult = await db
          .select({ slug: cmsVideos.slug, title: cmsVideos.title })
          .from(cmsVideos)
          .where(
            and(
              eq(cmsVideos.id, content.id),
              eq(cmsVideos.status, "PUBLISHED"),
              isNull(cmsVideos.deletedAt)
            )
          )
          .limit(1);

        if (videoResult.length > 0) {
          validatedContent.push({
            id: content.id,
            type: "video",
            title: videoResult[0].title,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${videoResult[0].slug}`,
          });

          logger.debug("Video content validated successfully", {
            api: true,
            contentId: content.id,
            title: videoResult[0].title,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${videoResult[0].slug}`,
          });
        } else {
          logger.warn(
            "Video content validation failed - not found or not published",
            {
              api: true,
              contentId: content.id,
              title: content.title,
            }
          );
        }
      }
    } catch (error) {
      logger.error("Content validation failed", error as Error, {
        api: true,
        patients: true,
        reminders: true,
        contentId: content.id,
        contentType: content.type,
      });
      continue;
    }
  }

  logger.info("Content validation completed", {
    api: true,
    patients: true,
    reminders: true,
    requested: attachedContent.length,
    validated: validatedContent.length,
  });

  return validatedContent;
}

// Helper function to get dynamic content prefix based on content type
function getContentPrefix(contentType: string): string {
  switch (contentType?.toLowerCase()) {
    case "article":
      return "📚 Baca juga:";
    case "video":
      return "🎥 Tonton juga:";
    default:
      return "📖 Lihat juga:";
  }
}

// Helper function to get content icon based on content type
function getContentIcon(contentType: string): string {
  switch (contentType?.toLowerCase()) {
    case "article":
      return "📄";
    case "video":
      return "🎥";
    default:
      return "📖";
  }
}

// Helper function to replace template variables in message
function replaceTemplateVariables(
  message: string,
  patientName: string,
  additionalVars?: Record<string, string>
): string {
  let processedMessage = message;

  // Replace patient name
  processedMessage = processedMessage.replace(/{nama}/g, patientName);

  // Replace additional variables if provided
  if (additionalVars) {
    Object.keys(additionalVars).forEach((key) => {
      const placeholder = `{${key}}`;
      if (processedMessage.includes(placeholder)) {
        processedMessage = processedMessage.replace(
          new RegExp(placeholder, 'g'),
          additionalVars[key] || ""
        );
      }
    });
  }

  return processedMessage;
}

// Helper function to generate enhanced WhatsApp message with content links
function generateEnhancedMessage(
  originalMessage: string,
  contentAttachments: Array<{
    id: string;
    type: "article" | "video";
    title: string;
    url: string;
  }>,
  patientName?: string
) {
  let message = originalMessage;

  // Replace template variables if patient name is provided
  if (patientName) {
    message = replaceTemplateVariables(message, patientName);
  }

  if (contentAttachments.length === 0) {
    return message;
  }

  // Group content by type for better organization
  const contentByType: { [key: string]: ValidatedContent[] } = {};
  contentAttachments.forEach((content) => {
    const type = content.type?.toLowerCase() || "other";
    if (!contentByType[type]) {
      contentByType[type] = [];
    }


    contentByType[type].push(content);
  });

  // Add content sections
  Object.keys(contentByType).forEach((contentType) => {
    const contents = contentByType[contentType];
    message += `\n\n${getContentPrefix(contentType)}`;

    contents.forEach((content) => {
      const icon = getContentIcon(content.type);
      message += `\n${icon} ${content.title}`;
      message += `\n   ${content.url}`;
    });
  });

  message += "\n\n💙 Tim PRIMA";

  return message;
}