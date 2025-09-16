import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  index,
} from "drizzle-orm/pg-core";

// Import enums
import {
  frequencyEnum,
  reminderStatusEnum,
  confirmationStatusEnum,
  patientConditionEnum,
  templateCategoryEnum,
} from "./enums";

// ===== REMINDER TABLES =====

export const reminderSchedules = pgTable(
  "reminder_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull(),
    scheduledTime: text("scheduled_time").notNull(),
    frequency: frequencyEnum("frequency").notNull().default("CUSTOM"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    customMessage: text("custom_message"),
    isActive: boolean("is_active").notNull().default(true),
    createdById: uuid("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    patientIdIdx: index("reminder_schedules_patient_id_idx").on(
      table.patientId
    ),
    isActiveIdx: index("reminder_schedules_is_active_idx").on(table.isActive),
    patientIdActiveIdx: index("reminder_schedules_patient_active_idx").on(
      table.patientId,
      table.isActive
    ),
    startDateIdx: index("reminder_schedules_start_date_idx").on(
      table.startDate
    ),
    endDateIdx: index("reminder_schedules_end_date_idx").on(table.endDate),
    createdAtActiveIdx: index("reminder_schedules_created_active_idx").on(
      table.createdAt,
      table.isActive
    ),
    deletedAtIdx: index("reminder_schedules_deleted_at_idx").on(
      table.deletedAt
    ),
    // Critical indexes for cron and instant send queries
    activeDeletedStartDateIdx: index(
      "reminder_schedules_active_deleted_start_idx"
    ).on(table.isActive, table.deletedAt, table.startDate),
    startDateActiveDeletedIdx: index(
      "reminder_schedules_start_active_deleted_idx"
    ).on(table.startDate, table.isActive, table.deletedAt),
    // For today's reminders filtering (most common query)
    todayRemindersIdx: index("reminder_schedules_today_reminders_idx").on(
      table.startDate,
      table.isActive,
      table.deletedAt,
      table.scheduledTime
    ),
  })
);

export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderScheduleId: uuid("reminder_schedule_id"),
    patientId: uuid("patient_id").notNull(),
    message: text("message").notNull(),
    phoneNumber: text("phone_number").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    status: reminderStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fonnteMessageId: text("fonnte_message_id"),
    // Confirmation fields
    confirmationStatus: confirmationStatusEnum("confirmation_status").default(
      "PENDING"
    ),
    confirmationSentAt: timestamp("confirmation_sent_at", {
      withTimezone: true,
    }),
    confirmationResponseAt: timestamp("confirmation_response_at", {
      withTimezone: true,
    }),
    confirmationMessage: text("confirmation_message"),
    confirmationResponse: text("confirmation_response"),
  },
  (table) => ({
    patientIdIdx: index("reminder_logs_patient_id_idx").on(table.patientId),
    reminderScheduleIdIdx: index("reminder_logs_reminder_schedule_id_idx").on(
      table.reminderScheduleId
    ),
    statusIdx: index("reminder_logs_status_idx").on(table.status),
    sentAtIdx: index("reminder_logs_sent_at_idx").on(table.sentAt),
    patientIdStatusIdx: index("reminder_logs_patient_status_idx").on(
      table.patientId,
      table.status
    ),
    sentAtStatusIdx: index("reminder_logs_sent_status_idx").on(
      table.sentAt,
      table.status
    ),
    // Critical index for compliance calculations - most frequent query
    deliveredStatusPatientIdx: index("reminder_logs_delivered_patient_idx").on(
      table.status,
      table.patientId
    ),
    // For today's reminder tracking in cron job
    scheduleStatusSentIdx: index("reminder_logs_schedule_status_sent_idx").on(
      table.reminderScheduleId,
      table.status,
      table.sentAt
    ),
    // Additional performance indexes
    sentAtPatientIdx: index("reminder_logs_sent_at_patient_idx").on(
      table.sentAt,
      table.patientId
    ),
    statusSentAtIdx: index("reminder_logs_status_sent_at_idx").on(
      table.status,
      table.sentAt
    ),
    // Confirmation indexes
    confirmationStatusIdx: index("reminder_logs_confirmation_status_idx").on(
      table.confirmationStatus
    ),
    confirmationSentAtIdx: index("reminder_logs_confirmation_sent_at_idx").on(
      table.confirmationSentAt
    ),
  })
);

export const manualConfirmations = pgTable(
  "manual_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull(),
    volunteerId: uuid("volunteer_id").notNull(),
    reminderScheduleId: uuid("reminder_schedule_id"),
    reminderLogId: uuid("reminder_log_id"),
    visitDate: timestamp("visit_date", { withTimezone: true }).notNull(),
    visitTime: text("visit_time").notNull(),
    patientCondition: patientConditionEnum("patient_condition").notNull(),
    symptomsReported: text("symptoms_reported").array().notNull().default([]),
    notes: text("notes"),
    followUpNeeded: boolean("follow_up_needed").notNull().default(false),
    followUpNotes: text("follow_up_notes"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdIdx: index("manual_confirmations_patient_id_idx").on(
      table.patientId
    ),
    volunteerIdIdx: index("manual_confirmations_volunteer_id_idx").on(
      table.volunteerId
    ),
    reminderScheduleIdIdx: index(
      "manual_confirmations_reminder_schedule_id_idx"
    ).on(table.reminderScheduleId),
    reminderLogIdIdx: index("manual_confirmations_reminder_log_id_idx").on(
      table.reminderLogId
    ),
    visitDateIdx: index("manual_confirmations_visit_date_idx").on(
      table.visitDate
    ),
    patientIdVisitDateIdx: index(
      "manual_confirmations_patient_visit_date_idx"
    ).on(table.patientId, table.visitDate),
    confirmedAtPatientIdIdx: index(
      "manual_confirmations_confirmed_patient_idx"
    ).on(table.confirmedAt, table.patientId),
    // Additional performance indexes for common queries
    confirmedAtIdx: index("manual_confirmations_confirmed_at_idx").on(
      table.confirmedAt
    ),

    patientConfirmedAtIdx: index(
      "manual_confirmations_patient_confirmed_at_idx"
    ).on(table.patientId, table.confirmedAt),
  })
);

export const whatsappTemplates = pgTable(
  "whatsapp_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateName: text("template_name").notNull().unique(),
    templateText: text("template_text").notNull(),
    variables: text("variables").array().notNull().default([]),
    category: templateCategoryEnum("category").notNull().default("REMINDER"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    categoryIdx: index("whatsapp_templates_category_idx").on(table.category),
    isActiveIdx: index("whatsapp_templates_is_active_idx").on(table.isActive),
    categoryActiveIdx: index("whatsapp_templates_category_active_idx").on(
      table.category,
      table.isActive
    ),
    createdByIdx: index("whatsapp_templates_created_by_idx").on(
      table.createdBy
    ),
    deletedAtIdx: index("whatsapp_templates_deleted_at_idx").on(
      table.deletedAt
    ),
  })
);

// ===== REMINDER CONTENT ATTACHMENTS TABLE =====

export const reminderContentAttachments = pgTable(
  "reminder_content_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderScheduleId: uuid("reminder_schedule_id")
      .notNull()
      .references(() => reminderSchedules.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull().$type<"article" | "video">(), // CHECK constraint: article or video
    contentId: uuid("content_id").notNull(), // References cms_articles.id OR cms_videos.id
    contentTitle: text("content_title").notNull(), // Snapshot for historical data
    contentUrl: text("content_url").notNull(), // Public URL at time of attachment
    attachmentOrder: integer("attachment_order").notNull().default(1), // For multiple attachments
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").notNull(),
  },
  (table) => ({
    // Prevent duplicate attachments
    uniqueReminderContent: index("reminder_content_unique_idx").on(
      table.reminderScheduleId,
      table.contentType,
      table.contentId
    ),
    // Performance indexes
    reminderScheduleIdIdx: index("reminder_content_reminder_idx").on(
      table.reminderScheduleId
    ),
    contentTypeIdIdx: index("reminder_content_type_id_idx").on(
      table.contentType,
      table.contentId
    ),
    createdAtIdx: index("reminder_content_created_at_idx").on(table.createdAt),
    createdByIdx: index("reminder_content_created_by_idx").on(table.createdBy),
  })
);
