import { createApiHandler } from "@/lib/api-helpers";
import { z } from "zod";
import { PatientAccessControl } from "@/services/patient/patient-access-control";
import { logger } from "@/lib/logger";
import { db, reminders, manualConfirmations, patients } from "@/db";
import { eq, and, isNull, desc, asc, gte, lte, inArray } from "drizzle-orm";
import { getWIBTime, shouldSendReminderNow, createWIBDateRange } from "@/lib/datetime";
import { del, CACHE_KEYS } from "@/lib/cache";
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/fonnte";
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
  manuallyConfirmed?: boolean;
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

// Zod schemas for validation
const paramsSchema = z.object({
  id: z.string().uuid(),
});

const querySchema = z.object({
  filter: z.enum(["all", "completed", "pending", "scheduled"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  date: z.string().optional(),
  includeDeleted: z.enum(["true", "false"]).transform((val: string) => val === "true").optional(),
});

const createReminderBodySchema = z.object({
  message: z.string().min(1, "Message is required"),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, use HH:MM"),
  selectedDates: z.array(z.string()).optional(),
  customRecurrence: z.object({
    frequency: z.enum(["day", "week", "month"]),
    interval: z.number().int().min(1),
    occurrences: z.number().int().min(1).max(1000).optional(),
    endType: z.enum(["never", "on", "after"]),
    endDate: z.string().optional(),
    daysOfWeek: z.array(z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"])).optional(),
  }).optional(),
  attachedContent: z.array(z.object({
    id: z.string(),
    type: z.enum(["article", "video", "ARTICLE", "VIDEO"]),
    title: z.string(),
  })).optional(),
});

const deleteRemindersBodySchema = z.object({
  reminderIds: z.array(z.string().uuid()).min(1, "At least one reminder ID is required"),
});

// GET /api/patients/[id]/reminders - Get patient reminders
export const GET = createApiHandler(
  { auth: "required", params: paramsSchema, query: querySchema },
  async (_, { user, params, query }) => {
    const { id: patientId } = params!;

    // Check patient access control
    await PatientAccessControl.requireAccess(
      user!.id,
      user!.role,
      patientId,
      "view this patient's reminders"
    );

    const { filter, page, limit, date: dateFilter, includeDeleted } = query!;
    const offset = (Number(page) - 1) * Number(limit);

    // Handle different filter types
    switch (filter) {
      case "completed":
        return await getCompletedReminders(patientId, user!.id, page, limit);
      case "pending":
        return await getPendingReminders(patientId, Number(page), Number(limit), dateFilter);
      case "scheduled":
        return await getScheduledReminders(patientId, Number(page), Number(limit), dateFilter);
      case "all":
      default:
        return await getAllReminders(patientId, Boolean(includeDeleted), Number(limit), offset);
    }
  }
);

async function getCompletedReminders(patientId: string, userId: string, page?: number | string, limit?: number | string) {
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
        inArray(reminders.status, ['DELIVERED', 'SENT', 'PENDING', 'FAILED'] as const)
      )
    );

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

  const transformedReminders: CompletedReminder[] = allReminders
    .filter((reminder) => {
      const manualConf = manualConfMap.get(reminder.id);
      return reminder.confirmationStatus === 'CONFIRMED' || !!manualConf;
    })
    .map((reminder) => {
      const manualConf = manualConfMap.get(reminder.id);
      const isManual = !!manualConf;

      return {
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
        reminderDate: reminder.startDate?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
        customMessage: reminder.message || undefined,
        confirmationStatus: 'CONFIRMED',
        confirmedAt: (manualConf?.confirmedAt || reminder.confirmationResponseAt || new Date()).toISOString(),
        sentAt: reminder.sentAt?.toISOString() || null,
        notes: manualConf?.notes || reminder.confirmationResponse || undefined,
        completionType: (isManual ? 'MANUAL' : 'AUTOMATED') as 'AUTOMATED' | 'MANUAL' | 'NONE',
        responseSource: (isManual ? 'MANUAL_ENTRY' : 'PATIENT_TEXT') as 'PATIENT_TEXT' | 'MANUAL_ENTRY' | 'SYSTEM',
        manuallyConfirmed: isManual,
      };
    })
    .sort((a, b) => {
      // Sort by confirmedAt descending (most recent first)
      const dateA = new Date(a.confirmedAt).getTime();
      const dateB = new Date(b.confirmedAt).getTime();
      return dateB - dateA;
    });

  // Always use pagination for consistency
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 20);
  const offset = (pageNum - 1) * limitNum;
  const total = transformedReminders.length;
  const totalPages = Math.ceil(total / limitNum);
  const paginatedReminders = transformedReminders.slice(offset, offset + limitNum);

  logger.info('Completed reminders fetched', {
    patientId,
    userId,
    count: paginatedReminders.length,
    page: pageNum,
    limit: limitNum,
    total,
    operation: 'fetch_completed_reminders'
  });

  return {
    data: paginatedReminders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    }
  };
}

async function getPendingReminders(patientId: string, page: number, limit: number, dateFilter: string | null) {
  const offset = (Number(page) - 1) * Number(limit);

  const sentStatuses: Array<"SENT" | "DELIVERED"> = ['SENT', 'DELIVERED'];

  const whereConditions = [
    eq(reminders.patientId, patientId),
    eq(reminders.isActive, true),
    isNull(reminders.deletedAt),
    inArray(reminders.status, sentStatuses)
  ];

  if (dateFilter) {
    try {
      const { start, end } = createWIBDateRange(dateFilter);
      whereConditions.push(gte(reminders.sentAt, start));
      whereConditions.push(lte(reminders.sentAt, end));
    } catch (dateError: unknown) {
      logger.error("Error in date filtering:", dateError instanceof Error ? dateError : new Error(String(dateError)));
    }
  }

  const allReminders = await db
    .select({
      id: reminders.id,
      status: reminders.status,
      sentAt: reminders.sentAt,
      confirmationStatus: reminders.confirmationStatus,
      confirmationResponse: reminders.confirmationResponse,
      confirmationResponseAt: reminders.confirmationResponseAt,
      confirmationSentAt: reminders.confirmationSentAt,
      scheduledTime: reminders.scheduledTime,
      customMessage: reminders.message,
    })
    .from(reminders)
    .where(and(...whereConditions))
    .orderBy(desc(reminders.sentAt));

  const reminderIds = allReminders.map((reminder) => reminder.id);
  const manualConfirmationsByReminder =
    reminderIds.length > 0
      ? await db
          .select({ reminderId: manualConfirmations.reminderId })
          .from(manualConfirmations)
          .where(inArray(manualConfirmations.reminderId, reminderIds))
      : [];

  const manuallyConfirmedIds = new Set(
    manualConfirmationsByReminder.map((entry) => entry.reminderId)
  );

  const filteredReminders = allReminders.filter((reminder) =>
    (reminder.confirmationStatus === 'PENDING' || reminder.confirmationStatus === 'MISSED' || reminder.confirmationStatus === null) &&
    !manuallyConfirmedIds.has(reminder.id)
  );

  const total = filteredReminders.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedReminders = filteredReminders
    .slice(offset, offset + limit)
    .map((reminder) => ({
      id: reminder.id,
      scheduledTime: reminder.scheduledTime || "12:00",
      reminderDate: reminder.sentAt ? reminder.sentAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      customMessage: reminder.customMessage,
      status: "PENDING_UPDATE",
      confirmationStatus: reminder.confirmationStatus,
      confirmationResponse: reminder.confirmationResponse,
      confirmationResponseAt: reminder.confirmationResponseAt,
      confirmationSentAt: reminder.confirmationSentAt,
      manuallyConfirmed: manuallyConfirmedIds.has(reminder.id),
    }));

  return {
    data: paginatedReminders,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }
  };
}

async function getScheduledReminders(patientId: string, page: number, limit: number, dateFilter: string | null) {
  const offset = (Number(page) - 1) * Number(limit);
  const scheduledStatuses: Array<"PENDING" | "FAILED"> = ['PENDING', 'FAILED'];

  const conditions = [
    eq(reminders.patientId, patientId),
    eq(reminders.isActive, true),
    isNull(reminders.deletedAt),
    inArray(reminders.status, scheduledStatuses),
  ];

  if (dateFilter) {
    try {
      const { start, end } = createWIBDateRange(dateFilter);
      conditions.push(gte(reminders.startDate, start));
      conditions.push(lte(reminders.startDate, end));
    } catch (dateError: unknown) {
      logger.error("Error in date filtering:", dateError instanceof Error ? dateError : new Error(String(dateError)));
    }
  }

  // Get total count first
  const countResult = await db
    .select({ count: db.fn.count(reminders.id) })
    .from(reminders)
    .where(and(...conditions));
  const total = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(total / limit);

  // Get paginated data
  const scheduledReminders = await db
    .select({
      id: reminders.id,
      scheduledTime: reminders.scheduledTime,
      startDate: reminders.startDate,
      customMessage: reminders.message,
      metadata: reminders.metadata,
    })
    .from(reminders)
    .where(and(...conditions))
    .orderBy(asc(reminders.startDate))
    .limit(limit)
    .offset(offset);

  const paginatedReminders = scheduledReminders
    .map((reminder) => {
      const metadata = reminder.metadata as { attachedContent?: unknown[] } | null;
      const attachedContent = metadata?.attachedContent;

      return {
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
        nextReminderDate: reminder.startDate.toISOString().split("T")[0],
        customMessage: reminder.customMessage,
        attachedContent: Array.isArray(attachedContent) ? attachedContent : [],
      };
    });

  return {
    data: paginatedReminders,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }
  };
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

  const reminderIds = patientReminders.map((reminder) => reminder.id);
  const manualConfirmationsByReminder =
    reminderIds.length > 0
      ? await db
          .select({ reminderId: manualConfirmations.reminderId })
          .from(manualConfirmations)
          .where(inArray(manualConfirmations.reminderId, reminderIds))
      : [];

  const manuallyConfirmedIds = new Set(
    manualConfirmationsByReminder.map((entry) => entry.reminderId)
  );

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
    manuallyConfirmed: manuallyConfirmedIds.has(reminder.id),
    reminderDate: (() => {
      const toDateString = (date: Date | null | undefined) =>
        date ? date.toISOString().split('T')[0] : null;

      const startDateString = toDateString(reminder.startDate);
      const sentDateString = toDateString(reminder.sentAt);

      if (reminder.status === 'PENDING' || reminder.status === 'FAILED') {
        return startDateString;
      }

      return sentDateString ?? startDateString;
    })(),
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

  return response;
}

// POST /api/patients/[id]/reminders - Create new reminders
export const POST = createApiHandler(
  { auth: "required", params: paramsSchema, body: createReminderBodySchema },
  async (body, { user, params }) => {
    const { id } = params!;

    // Check role-based access to this patient
    await PatientAccessControl.requireAccess(
      user!.id,
      user!.role,
      id,
      "create reminders for this patient"
    );

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
      throw new Error("Patient not found");
    }

    const patient = patientResult[0];

    // Type the body properly
    const reminderBody = body as {
      message: string;
      time: string;
      selectedDates?: string[];
      customRecurrence?: {
        frequency: string;
        interval: number;
        daysOfWeek?: string[];
        endDate?: string;
      };
      attachedContent?: {
        id: string;
        type: 'article' | 'video' | 'ARTICLE' | 'VIDEO';
        title: string;
        url?: string;
      }[];
    };

    // Validate input and generate schedules data
    const { message, time, datesToSchedule, validatedContent } =
      await validateReminderInput(reminderBody, patient);

    // Create reminder schedules
    const createdSchedules = await createReminderSchedules(
      id,
      message,
      time,
      datesToSchedule,
      validatedContent,
      user!.id
    );

    // Handle immediate reminders if any should be sent now
    await sendImmediateReminders(createdSchedules, patient, message, validatedContent, time);

    return {
      message: "Reminders created successfully",
      count: createdSchedules.length,
      schedules: createdSchedules.map((s) => ({
        id: s.id,
        startDate: s.startDate,
        scheduledTime: s.scheduledTime,
      })),
      recurrenceType: "manual", // Simplified for now
    };
  }
);

// DELETE /api/patients/[id]/reminders - Delete multiple reminders
export const DELETE = createApiHandler(
  { auth: "required", params: paramsSchema, body: deleteRemindersBodySchema },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (body, { user: _, params }) => {
    const { id } = params!;
    const { reminderIds } = body as { reminderIds: string[] };

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

    return {
      success: true,
      message: "Reminders berhasil dihapus",
      deletedCount: deleteResult.length,
    };
  }
);

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
