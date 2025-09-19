import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { shouldSendReminderNow } from "@/lib/timezone";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { createErrorResponse, handleApiError } from "@/lib/api-utils";
import {
  db,
  patients,
  reminders,
  cmsArticles,
  cmsVideos,
} from "@/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/fonnte";
import { getWIBTime } from "@/lib/timezone";
import { logger } from "@/lib/logger";
import { requirePatientAccess } from "@/lib/patient-access-control";
// Rate limiter temporarily disabled

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

    // Check role-based access to this patient
    await requirePatientAccess(
      user.id,
      user.role,
      id,
      "view this patient's reminders"
    );

    // Get reminders for patient with patient info
    const patientReminders = await db
      .select({
        // Reminder fields
        id: reminders.id,
        patientId: reminders.patientId,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        endDate: reminders.endDate,
        customMessage: reminders.message,
        isActive: reminders.isActive,
        createdById: reminders.createdById,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
        // Patient fields
        patientName: patients.name,
        patientPhoneNumber: patients.phoneNumber,
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(eq(reminders.patientId, id))
      .orderBy(desc(reminders.createdAt));

    // Format response to match Prisma structure
    const formattedReminders = patientReminders.map((reminder) => ({
      id: reminder.id,
      patientId: reminder.patientId,
      scheduledTime: reminder.scheduledTime,
      frequency: "DAILY", // Default frequency for new schema
      startDate: reminder.startDate,
      endDate: reminder.endDate,
      customMessage: reminder.customMessage,
      isActive: reminder.isActive,
      createdById: reminder.createdById,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
      patient: {
        name: reminder.patientName,
        phoneNumber: reminder.patientPhoneNumber,
      },
    }));

    return NextResponse.json(formattedReminders);
  } catch (error) {
    return handleApiError(error, "creating patient reminders");
  }
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
      // Generate enhanced message with content attachments
      const enhancedMessage = generateEnhancedMessage(message, validatedContent);

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
      await invalidateCache(CACHE_KEYS.reminderStats(patient.id));

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

// Helper function to generate enhanced WhatsApp message with content links
function generateEnhancedMessage(
  originalMessage: string,
  contentAttachments: Array<{
    id: string;
    type: "article" | "video";
    title: string;
    url: string;
  }>
) {
  if (contentAttachments.length === 0) {
    return originalMessage;
  }

  let message = originalMessage;

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
