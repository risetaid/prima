import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
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
    // Composite indexes for common queries
    patientActiveIdx: index("reminders_patient_active_idx").on(table.patientId, table.isActive),
    patientStatusIdx: index("reminders_patient_status_idx").on(table.patientId, table.status),
    todayRemindersIdx: index("reminders_today_idx").on(table.startDate, table.isActive, table.scheduledTime),
  })
);

export const manualConfirmations = pgTable(
  "manual_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull(),
    volunteerId: uuid("volunteer_id").notNull(),
    reminderId: uuid("reminder_id"),
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
    patientIdIdx: index("manual_confirmations_patient_id_idx").on(table.patientId),
    volunteerIdIdx: index("manual_confirmations_volunteer_id_idx").on(table.volunteerId),
    reminderIdIdx: index("manual_confirmations_reminder_id_idx").on(table.reminderId),
    visitDateIdx: index("manual_confirmations_visit_date_idx").on(table.visitDate),
    confirmedAtIdx: index("manual_confirmations_confirmed_at_idx").on(table.confirmedAt),
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