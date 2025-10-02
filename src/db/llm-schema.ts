import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  numeric,
  jsonb,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { patients } from "@/db/patient-schema";

// ===== LLM TABLES =====

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
    patientIdIdx: index("conversation_states_patient_id_idx").on(table.patientId),
    deletedAtIdx: index("conversation_states_deleted_at_idx").on(table.deletedAt),
    // Foreign key to patients
    patientIdFk: foreignKey({
      columns: [table.patientId],
      foreignColumns: [patients.id],
      name: "conversation_states_patient_id_patients_id_fk",
    }),
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
    llmResponseId: text("llm_response_id"),
    llmModel: text("llm_model"),
    llmTokensUsed: integer("llm_tokens_used"),
    llmCost: numeric("llm_cost", { precision: 10, scale: 6 }),
    llmResponseTimeMs: integer("llm_response_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationStateIdIdx: index("conversation_messages_conversation_state_id_idx").on(table.conversationStateId),
    llmModelIdx: index("conversation_messages_llm_model_idx").on(table.llmModel),
    llmTokensIdx: index("conversation_messages_llm_tokens_idx").on(table.llmTokensUsed),
    llmCostIdx: index("conversation_messages_llm_cost_idx").on(table.llmCost),
    llmStatsIdx: index("conversation_messages_llm_stats_idx").on(table.llmModel, table.llmTokensUsed, table.llmCost),
    // Foreign key to conversation_states
    conversationStateIdFk: foreignKey({
      columns: [table.conversationStateId],
      foreignColumns: [conversationStates.id],
      name: "conversation_messages_conversation_state_id_conversation_states_id_fk",
    }),
  })
);

// LLM response cache removed - now using Redis for simpler caching

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
  })
);

// ===== TYPE EXPORTS =====
export type ConversationState = typeof conversationStates.$inferSelect;
export type NewConversationState = typeof conversationStates.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type VolunteerNotification = typeof volunteerNotifications.$inferSelect;
export type NewVolunteerNotification = typeof volunteerNotifications.$inferInsert;