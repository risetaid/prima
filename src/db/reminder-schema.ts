import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// Import clean enums
import {
  reminderStatusEnum,
  confirmationStatusEnum,
  reminderTypeEnum,
  patientConditionEnum,
  templateCategoryEnum,
} from "./enums";

// Import patient table for foreign key reference
import { patients } from "./patient-schema";

// Re-export enums for convenience
export {
  reminderStatusEnum,
  confirmationStatusEnum,
  reminderTypeEnum,
  patientConditionEnum,
  templateCategoryEnum,
};

// ===== REMINDER TABLES =====

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    reminderType: reminderTypeEnum("reminder_type").notNull().default("GENERAL"),
    scheduledTime: text("scheduled_time").notNull(),
    message: text("message").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdById: uuid("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    // Delivery tracking
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: reminderStatusEnum("status").notNull().default("PENDING"),
    fonnteMessageId: text("fonnte_message_id"),
    // Confirmation tracking
    confirmationStatus: confirmationStatusEnum("confirmation_status").default("PENDING"),
    confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
    confirmationResponseAt: timestamp("confirmation_response_at", { withTimezone: true }),
    confirmationResponse: text("confirmation_response"),
    // Enhanced fields for general reminder support
    title: text("title"),
    description: text("description"),
    priority: text("priority", { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium'),
    recurrencePattern: jsonb("recurrence_pattern"),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    patientIdIdx: index("reminders_patient_id_idx").on(table.patientId),
    isActiveIdx: index("reminders_is_active_idx").on(table.isActive),
    statusIdx: index("reminders_status_idx").on(table.status),
    reminderTypeIdx: index("reminders_type_idx").on(table.reminderType),
    startDateIdx: index("reminders_start_date_idx").on(table.startDate),
    sentAtIdx: index("reminders_sent_at_idx").on(table.sentAt),
    confirmationStatusIdx: index("reminders_confirmation_status_idx").on(table.confirmationStatus),
    deletedAtIdx: index("reminders_deleted_at_idx").on(table.deletedAt),
    priorityIdx: index("reminders_priority_idx").on(table.priority),
    // Composite indexes for common queries
    patientActiveIdx: index("reminders_patient_active_idx").on(table.patientId, table.isActive),
    patientStatusIdx: index("reminders_patient_status_idx").on(table.patientId, table.status),
    todayRemindersIdx: index("reminders_today_idx").on(table.startDate, table.isActive, table.scheduledTime),
    typeStatusIdx: index("reminders_type_status_idx").on(table.reminderType, table.status),
    patientTypeIdx: index("reminders_patient_type_idx").on(table.patientId, table.reminderType),
    activeTypeIdx: index("reminders_active_type_idx").on(table.isActive, table.reminderType),
  })
);

export const manualConfirmations = pgTable(
  "manual_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull(),
    volunteerId: uuid("volunteer_id").notNull(),
    reminderId: uuid("reminder_id"),
    reminderType: reminderTypeEnum("reminder_type"),
    confirmationType: text("confirmation_type", { enum: ['VISIT', 'PHONE_CALL', 'MESSAGE', 'GENERAL'] }).notNull().default('GENERAL'),
    visitDate: timestamp("visit_date", { withTimezone: true }),
    visitTime: text("visit_time"),
    patientCondition: patientConditionEnum("patient_condition"),
    symptomsReported: text("symptoms_reported").array().default([]),
    notes: text("notes"),
    followUpNeeded: boolean("follow_up_needed").notNull().default(false),
    followUpNotes: text("follow_up_notes"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    patientIdIdx: index("manual_confirmations_patient_id_idx").on(table.patientId),
    volunteerIdIdx: index("manual_confirmations_volunteer_id_idx").on(table.volunteerId),
    reminderIdIdx: index("manual_confirmations_reminder_id_idx").on(table.reminderId),
    reminderTypeIdx: index("manual_confirmations_reminder_type_idx").on(table.reminderType),
    confirmationTypeIdx: index("manual_confirmations_confirmation_type_idx").on(table.confirmationType),
    visitDateIdx: index("manual_confirmations_visit_date_idx").on(table.visitDate),
    confirmedAtIdx: index("manual_confirmations_confirmed_at_idx").on(table.confirmedAt),
    patientVolunteerIdx: index("manual_confirmations_patient_volunteer_idx").on(table.patientId, table.volunteerId),
    reminderConfirmationIdx: index("manual_confirmations_reminder_confirmation_idx").on(table.reminderType, table.confirmationType),
  })
);

export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderId: uuid("reminder_id").notNull().references(() => reminders.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // SENT, DELIVERED, FAILED, CONFIRMED, MISSED, FOLLOWUP_SENT
    actionType: text("action_type"), // INITIAL, FOLLOWUP, MANUAL, AUTOMATIC
    message: text("message"),
    response: text("response"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    reminderIdIdx: index("reminder_logs_reminder_id_idx").on(table.reminderId),
    patientIdIdx: index("reminder_logs_patient_id_idx").on(table.patientId),
    actionIdx: index("reminder_logs_action_idx").on(table.action),
    timestampIdx: index("reminder_logs_timestamp_idx").on(table.timestamp),
    reminderActionIdx: index("reminder_logs_reminder_action_idx").on(table.reminderId, table.action),
    patientTimestampIdx: index("reminder_logs_patient_timestamp_idx").on(table.patientId, table.timestamp),
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
    createdByIdx: index("whatsapp_templates_created_by_idx").on(table.createdBy),
    deletedAtIdx: index("whatsapp_templates_deleted_at_idx").on(table.deletedAt),
  })
);

// Export types for use in other files
export type Reminder = typeof reminders.$inferSelect;
export type ReminderInsert = typeof reminders.$inferInsert;
export type ReminderLog = typeof reminderLogs.$inferSelect;
export type ReminderLogInsert = typeof reminderLogs.$inferInsert;
export type ManualConfirmation = typeof manualConfirmations.$inferSelect;
export type ManualConfirmationInsert = typeof manualConfirmations.$inferInsert;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type WhatsappTemplateInsert = typeof whatsappTemplates.$inferInsert;