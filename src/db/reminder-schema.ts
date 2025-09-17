import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  index,
  jsonb,
  decimal,
} from "drizzle-orm/pg-core";

// Import enums
import {
  frequencyEnum,
  reminderStatusEnum,
  confirmationStatusEnum,
  patientConditionEnum,
  templateCategoryEnum,
  followupStatusEnum,
  followupTypeEnum,
  medicationCategoryEnum,
  medicationFormEnum,
  medicationFrequencyEnum,
  medicationTimingEnum,
  medicationUnitEnum,
} from "./enums";

// Import patient table for foreign key reference
import { patients } from "./patient-schema";

// ===== REMINDER TABLES =====

export const reminderSchedules = pgTable(
  "reminder_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    scheduledTime: text("scheduled_time").notNull(),
    frequency: frequencyEnum("frequency").notNull().default("CUSTOM"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    customMessage: text("custom_message"),
    medicationDetails: jsonb("medication_details"), // Structured medication data
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
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
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
    medicationsTaken: text("medications_taken").array().default([]),
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

// ===== FOLLOWUP TABLES =====

export const reminderFollowups = pgTable(
  "reminder_followups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderLogId: uuid("reminder_log_id")
      .notNull()
      .references(() => reminderLogs.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    followupType: followupTypeEnum("followup_type").notNull().default("REMINDER_CONFIRMATION"),
    status: followupStatusEnum("status").notNull().default("PENDING"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    message: text("message").notNull(),
    response: text("response"),
    responseAt: timestamp("response_at", { withTimezone: true }),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    queueJobId: text("queue_job_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    reminderLogIdIdx: index("reminder_followups_reminder_log_id_idx").on(
      table.reminderLogId
    ),
    patientIdIdx: index("reminder_followups_patient_id_idx").on(table.patientId),
    statusIdx: index("reminder_followups_status_idx").on(table.status),
    followupTypeIdx: index("reminder_followups_followup_type_idx").on(
      table.followupType
    ),
    scheduledAtIdx: index("reminder_followups_scheduled_at_idx").on(
      table.scheduledAt
    ),
    patientStatusIdx: index("reminder_followups_patient_status_idx").on(
      table.patientId,
      table.status
    ),
    scheduledStatusIdx: index("reminder_followups_scheduled_status_idx").on(
      table.scheduledAt,
      table.status
    ),
    // Critical indexes for queue processing
    pendingScheduledIdx: index("reminder_followups_pending_scheduled_idx").on(
      table.status,
      table.scheduledAt
    ),
    retryCountIdx: index("reminder_followups_retry_count_idx").on(
      table.retryCount
    ),
    // For performance monitoring
    sentAtIdx: index("reminder_followups_sent_at_idx").on(table.sentAt),
    deliveredAtIdx: index("reminder_followups_delivered_at_idx").on(
      table.deliveredAt
    ),
    // Composite indexes for common queries
    patientTypeStatusIdx: index("reminder_followups_patient_type_status_idx").on(
      table.patientId,
      table.followupType,
      table.status
    ),
  })
);

// ===== MEDICATION ADMINISTRATION LOGS TABLE =====

export const medicationAdministrationLogs = pgTable(
  "medication_administration_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    medicationScheduleId: uuid("medication_schedule_id").references(() => medicationSchedules.id, { onDelete: "set null" }),
    reminderScheduleId: uuid("reminder_schedule_id").references(() => reminderSchedules.id, { onDelete: "set null" }),
    reminderLogId: uuid("reminder_log_id").references(() => reminderLogs.id, { onDelete: "set null" }),
    medicationName: text("medication_name").notNull(),
    scheduledDateTime: timestamp("scheduled_date_time", { withTimezone: true }).notNull(),
    actualDateTime: timestamp("actual_date_time", { withTimezone: true }),
    dosage: text("dosage").notNull(),
    dosageTaken: text("dosage_taken"),
    status: text("status").notNull().$type<"TAKEN" | "MISSED" | "PARTIAL" | "REFUSED" | "DELAYED">(),
    administeredBy: text("administered_by").notNull().$type<"PATIENT" | "CAREGIVER" | "HEALTHCARE_WORKER" | "SYSTEM">(),
    notes: text("notes"),
    sideEffects: text("side_effects"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    patientIdIdx: index("medication_admin_logs_patient_id_idx").on(table.patientId),
    medicationScheduleIdIdx: index("medication_admin_logs_medication_schedule_id_idx").on(table.medicationScheduleId),
    reminderScheduleIdIdx: index("medication_admin_logs_reminder_schedule_id_idx").on(table.reminderScheduleId),
    reminderLogIdIdx: index("medication_admin_logs_reminder_log_id_idx").on(table.reminderLogId),
    scheduledDateTimeIdx: index("medication_admin_logs_scheduled_date_time_idx").on(table.scheduledDateTime),
    actualDateTimeIdx: index("medication_admin_logs_actual_date_time_idx").on(table.actualDateTime),
    statusIdx: index("medication_admin_logs_status_idx").on(table.status),
    administeredByIdx: index("medication_admin_logs_administered_by_idx").on(table.administeredBy),
    patientScheduledIdx: index("medication_admin_logs_patient_scheduled_idx").on(table.patientId, table.scheduledDateTime),
    patientStatusIdx: index("medication_admin_logs_patient_status_idx").on(table.patientId, table.status),
    scheduledStatusIdx: index("medication_admin_logs_scheduled_status_idx").on(table.scheduledDateTime, table.status),
    // Performance indexes for compliance tracking
    patientDateStatusIdx: index("medication_admin_logs_patient_date_status_idx").on(table.patientId, table.scheduledDateTime, table.status),
    createdAtIdx: index("medication_admin_logs_created_at_idx").on(table.createdAt),
  })
);

// ===== MEDICATION SCHEDULES TABLE =====

export const medicationSchedules = pgTable(
  "medication_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    reminderScheduleId: uuid("reminder_schedule_id").references(() => reminderSchedules.id, { onDelete: "set null" }),
    medicationName: text("medication_name").notNull(),
    genericName: text("generic_name"),
    category: medicationCategoryEnum("category").notNull().default("OTHER"),
    form: medicationFormEnum("form").notNull().default("TABLET"),
    dosage: text("dosage").notNull(), // e.g., "500mg", "2 tablets"
    dosageValue: decimal("dosage_value", { precision: 10, scale: 3 }), // Numeric value for calculations
    dosageUnit: medicationUnitEnum("dosage_unit").notNull().default("MG"),
    frequency: medicationFrequencyEnum("frequency").notNull().default("ONCE_DAILY"),
    timing: medicationTimingEnum("timing").notNull().default("ANYTIME"),
    instructions: text("instructions"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    prescribedBy: text("prescribed_by"), // Doctor's name
    pharmacy: text("pharmacy"),
    notes: text("notes"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    patientIdIdx: index("medication_schedules_patient_id_idx").on(table.patientId),
    reminderScheduleIdIdx: index("medication_schedules_reminder_schedule_id_idx").on(table.reminderScheduleId),
    categoryIdx: index("medication_schedules_category_idx").on(table.category),
    formIdx: index("medication_schedules_form_idx").on(table.form),
    frequencyIdx: index("medication_schedules_frequency_idx").on(table.frequency),
    isActiveIdx: index("medication_schedules_is_active_idx").on(table.isActive),
    startDateIdx: index("medication_schedules_start_date_idx").on(table.startDate),
    endDateIdx: index("medication_schedules_end_date_idx").on(table.endDate),
    patientActiveIdx: index("medication_schedules_patient_active_idx").on(table.patientId, table.isActive),
    patientDateActiveIdx: index("medication_schedules_patient_date_active_idx").on(table.patientId, table.startDate, table.isActive),
    deletedAtIdx: index("medication_schedules_deleted_at_idx").on(table.deletedAt),
    // Performance indexes for common queries
    activeStartDateIdx: index("medication_schedules_active_start_date_idx").on(table.isActive, table.startDate),
    patientCategoryIdx: index("medication_schedules_patient_category_idx").on(table.patientId, table.category),
    patientFrequencyIdx: index("medication_schedules_patient_frequency_idx").on(table.patientId, table.frequency),
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
