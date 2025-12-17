import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  jsonb,
  integer,
  foreignKey,
} from "drizzle-orm/pg-core";

// Import clean enums
import {
  reminderStatusEnum,
  confirmationStatusEnum,
  reminderTypeEnum,
  patientConditionEnum,
  templateCategoryEnum,
} from "@/db/enums";

// Import patient and users tables for foreign key reference
import { patients, users } from "@/db/core-schema";

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
    wahaMessageId: text("waha_message_id"), // Legacy column name - actually stores GOWA message IDs
    fonnteLegacyMessageId: text("fonnte_message_id"), // Legacy: old WhatsApp provider before GOWA
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
    // Composite indexes for common queries
    patientActiveIdx: index("reminders_patient_active_idx").on(table.patientId, table.isActive),
    patientStatusIdx: index("reminders_patient_status_idx").on(table.patientId, table.status),
    todayRemindersIdx: index("reminders_today_idx").on(table.startDate, table.isActive, table.scheduledTime),
    patientTypeIdx: index("reminders_patient_type_idx").on(table.patientId, table.reminderType),
    // Foreign key to users
    createdByIdFk: foreignKey({
      columns: [table.createdById],
      foreignColumns: [users.id],
      name: "reminders_created_by_id_users_id_fk",
    }),
    // Note: Removed 9 redundant single-column indexes (patientId, isActive, status, reminderType,
    // startDate, sentAt, confirmationStatus, deletedAt, priority)
    // These are covered by composite indexes or have low cardinality
    // Also removed typeStatusIdx and activeTypeIdx composites (not commonly used)
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
    medicationsTaken: text("medications_taken").array().default([]),
    notes: text("notes"),
    followUpNeeded: boolean("follow_up_needed").notNull().default(false),
    followUpNotes: text("follow_up_notes"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Composite index for common queries
    patientVolunteerIdx: index("manual_confirmations_patient_volunteer_idx").on(table.patientId, table.volunteerId),
    // Foreign keys
    patientIdFk: foreignKey({
      columns: [table.patientId],
      foreignColumns: [patients.id],
      name: "manual_confirmations_patient_id_patients_id_fk",
    }),
    volunteerIdFk: foreignKey({
      columns: [table.volunteerId],
      foreignColumns: [users.id],
      name: "manual_confirmations_volunteer_id_users_id_fk",
    }),
    reminderIdFk: foreignKey({
      columns: [table.reminderId],
      foreignColumns: [reminders.id],
      name: "manual_confirmations_reminder_id_reminders_id_fk",
    }),
    // Note: Removed 7 redundant single-column indexes (patientId, volunteerId, reminderId,
    // reminderType, confirmationType, visitDate, confirmedAt)
    // patientId and volunteerId covered by composite index
    // Other indexes rarely queried independently
    // Also removed reminderConfirmationIdx composite (low usage)
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
    // Composite indexes for analytics queries
    reminderActionIdx: index("reminder_logs_reminder_action_idx").on(table.reminderId, table.action),
    patientTimestampIdx: index("reminder_logs_patient_timestamp_idx").on(table.patientId, table.timestamp),
    // Note: Removed 4 redundant single-column indexes (reminderId, patientId, action, timestamp)
    // These are all covered by the composite indexes above
    // Table is also currently empty (0 rows)
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
    // Foreign key to users
    createdByFk: foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "whatsapp_templates_created_by_users_id_fk",
    }),
    // Note: Table is currently empty (0 rows). Add indexes when table has >1000 rows.
    // Removed 4 single-column indexes: category, isActive, createdBy, deletedAt
    // templateName already has unique constraint which creates an index automatically
  })
);

// ===== CONVERSATION TRACKING TABLES =====

export const conversationStates = pgTable(
  "conversation_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull(),
    phoneNumber: text("phone_number").notNull(),
    currentContext: text("current_context").notNull(),
    expectedResponseType: text("expected_response_type"),
    relatedEntityId: uuid("related_entity_id"),
    relatedEntityType: text("related_entity_type"),
    stateData: jsonb("state_data"),
    lastMessage: text("last_message"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    messageCount: integer("message_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    attemptCount: integer("attempt_count").notNull().default(0),
    contextSetAt: timestamp("context_set_at", { withTimezone: true }),
    lastClarificationSentAt: timestamp("last_clarification_sent_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // Composite index for active conversation lookup (Phase 3 optimization)
    // Query pattern: "Get active conversations for patient that haven't expired"
    patientActiveExpiresIdx: index("conversation_states_patient_active_expires_idx")
      .on(table.patientId, table.isActive, table.expiresAt),
    // Foreign key to patients
    patientIdFk: foreignKey({
      columns: [table.patientId],
      foreignColumns: [patients.id],
      name: "conversation_states_patient_id_patients_id_fk",
    }),
    // Note: Removed 2 redundant single-column indexes (patientId, deletedAt)
    // patientId is covered by composite index patientActiveExpiresIdx
    // deletedAt is rarely queried independently
  })
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationStateId: uuid("conversation_state_id").notNull(),
    message: text("message").notNull(),
    direction: text("direction").notNull(),
    messageType: text("message_type").notNull(),
    intent: text("intent"),
    confidence: integer("confidence"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    // AI metadata fields
    llmResponseId: text("llm_response_id"),
    llmModel: text("llm_model"),
    llmTokensUsed: integer("llm_tokens_used"),
    llmResponseTimeMs: integer("llm_response_time_ms"),
    llmCost: text("llm_cost"), // Stored as string to preserve precision
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Composite index for message history retrieval (Phase 3 optimization)
    // Query pattern: "Get all messages for conversation ordered by time"
    stateCreatedIdx: index("conversation_messages_state_created_idx")
      .on(table.conversationStateId, table.createdAt),
    conversationStateIdFk: foreignKey({
      columns: [table.conversationStateId],
      foreignColumns: [conversationStates.id],
      name: "conversation_messages_conversation_state_id_conversation_states_id_fk",
    }),
    // Note: Removed redundant single-column index on conversationStateId
    // It's covered by the composite index stateCreatedIdx
  })
);

export const volunteerNotifications = pgTable(
  "volunteer_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull(),
    message: text("message").notNull(),
    priority: text("priority").notNull(),
    status: text("status").notNull().default("pending"),
    assignedVolunteerId: uuid("assigned_volunteer_id"),
    escalationReason: text("escalation_reason").notNull(),
    confidence: integer("confidence"),
    intent: text("intent"),
    patientContext: jsonb("patient_context"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    response: text("response"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdIdx: index("volunteer_notifications_patient_id_idx").on(table.patientId),
    // Foreign key to patients
    patientIdFk: foreignKey({
      columns: [table.patientId],
      foreignColumns: [patients.id],
      name: "volunteer_notifications_patient_id_patients_id_fk",
    }),
    assignedVolunteerIdFk: foreignKey({
      columns: [table.assignedVolunteerId],
      foreignColumns: [users.id],
      name: "volunteer_notifications_assigned_volunteer_id_users_id_fk",
    }),
  })
);

// ===== TYPE EXPORTS =====
export type Reminder = typeof reminders.$inferSelect;
export type ReminderInsert = typeof reminders.$inferInsert;
export type ReminderLog = typeof reminderLogs.$inferSelect;
export type ReminderLogInsert = typeof reminderLogs.$inferInsert;
export type ManualConfirmation = typeof manualConfirmations.$inferSelect;
export type ManualConfirmationInsert = typeof manualConfirmations.$inferInsert;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type WhatsappTemplateInsert = typeof whatsappTemplates.$inferInsert;
export type ConversationState = typeof conversationStates.$inferSelect;
export type NewConversationState = typeof conversationStates.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type VolunteerNotification = typeof volunteerNotifications.$inferSelect;
export type NewVolunteerNotification = typeof volunteerNotifications.$inferInsert;