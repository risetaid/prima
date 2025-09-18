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
  cancerStageEnum,
  medicalRecordTypeEnum,
  verificationStatusEnum,
} from "./enums";

// ===== PATIENT TABLES =====

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phoneNumber: text("phone_number").notNull(),
    address: text("address"),
    birthDate: timestamp("birth_date", { withTimezone: true }),
    diagnosisDate: timestamp("diagnosis_date", { withTimezone: true }),
    cancerStage: cancerStageEnum("cancer_stage"),
    assignedVolunteerId: uuid("assigned_volunteer_id"),
    doctorName: text("doctor_name"),
    hospitalName: text("hospital_name"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    photoUrl: text("photo_url"),
    // Verification fields
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("pending_verification"),
    verificationSentAt: timestamp("verification_sent_at", {
      withTimezone: true,
    }),
    verificationResponseAt: timestamp("verification_response_at", {
      withTimezone: true,
    }),
    verificationMessage: text("verification_message"),
    verificationAttempts: text("verification_attempts").default("0"),
    verificationExpiresAt: timestamp("verification_expires_at", {
      withTimezone: true,
    }),
    lastReactivatedAt: timestamp("last_reactivated_at", { withTimezone: true }),
    // Unsubscribe tracking fields
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    unsubscribeReason: text("unsubscribe_reason"),
    unsubscribeMethod: text("unsubscribe_method").$type<"manual" | "llm_analysis" | "keyword_detection" | "api">(),
  },
  (table) => ({
    isActiveIdx: index("patients_is_active_idx").on(table.isActive),
    assignedVolunteerIdx: index("patients_assigned_volunteer_idx").on(
      table.assignedVolunteerId
    ),
    assignedVolunteerActiveIdx: index(
      "patients_assigned_volunteer_active_idx"
    ).on(table.assignedVolunteerId, table.isActive),
    phoneNumberIdx: index("patients_phone_number_idx").on(table.phoneNumber),
    createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
    verificationStatusIdx: index("patients_verification_status_idx").on(
      table.verificationStatus
    ),
    verificationStatusActiveIdx: index(
      "patients_verification_status_active_idx"
    ).on(table.verificationStatus, table.isActive),
    deletedAtIdx: index("patients_deleted_at_idx").on(table.deletedAt),
    // Critical composite indexes for dashboard queries
    deletedActiveIdx: index("patients_deleted_active_idx").on(
      table.deletedAt,
      table.isActive
    ),
    deletedActiveNameIdx: index("patients_deleted_active_name_idx").on(
      table.deletedAt,
      table.isActive,
      table.name
    ),
    // For volunteer assignment queries
    assignedDeletedActiveIdx: index("patients_assigned_deleted_active_idx").on(
      table.assignedVolunteerId,
      table.deletedAt,
      table.isActive
    ),
  })
);

export const medicalRecords = pgTable(
  "medical_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    recordType: medicalRecordTypeEnum("record_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    recordedDate: timestamp("recorded_date", { withTimezone: true }).notNull(),
    recordedBy: uuid("recorded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdIdx: index("medical_records_patient_id_idx").on(table.patientId),
    recordTypeIdx: index("medical_records_record_type_idx").on(
      table.recordType
    ),
    recordedDateIdx: index("medical_records_recorded_date_idx").on(
      table.recordedDate
    ),
    recordedByIdx: index("medical_records_recorded_by_idx").on(
      table.recordedBy
    ),
    patientRecordedDateIdx: index(
      "medical_records_patient_recorded_date_idx"
    ).on(table.patientId, table.recordedDate),
  })
);


export const healthNotes = pgTable(
  "health_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    note: text("note").notNull(),
    noteDate: timestamp("note_date", { withTimezone: true }).notNull(),
    recordedBy: uuid("recorded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    patientIdIdx: index("health_notes_patient_id_idx").on(table.patientId),
    patientIdNoteDateIdx: index("health_notes_patient_note_date_idx").on(
      table.patientId,
      table.noteDate
    ),
    recordedByIdx: index("health_notes_recorded_by_idx").on(table.recordedBy),
    deletedAtIdx: index("health_notes_deleted_at_idx").on(table.deletedAt),
  })
);

export const patientVariables = pgTable(
  "patient_variables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    variableName: text("variable_name").notNull(), // nama, obat, dosis, dokter, etc
    variableValue: text("variable_value").notNull(),
    variableCategory: text("variable_category").notNull().$type<"PERSONAL" | "MEDICAL" | "MEDICATION" | "CAREGIVER" | "HOSPITAL" | "OTHER">().default("PERSONAL"),
    variableMetadata: jsonb("variable_metadata"), // Additional structured data
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdById: uuid("created_by_id").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    patientVarIdx: index("patient_variables_patient_idx").on(table.patientId),
    patientVarNameIdx: index("patient_variables_name_idx").on(
      table.patientId,
      table.variableName
    ),
    patientActiveVarIdx: index("patient_variables_patient_active_idx").on(
      table.patientId,
      table.isActive
    ),
    deletedAtIdx: index("patient_variables_deleted_at_idx").on(table.deletedAt),
    // Medication-specific indexes
    variableCategoryIdx: index("patient_variables_category_idx").on(table.variableCategory),
    patientCategoryIdx: index("patient_variables_patient_category_idx").on(table.patientId, table.variableCategory),
    patientCategoryActiveIdx: index("patient_variables_patient_category_active_idx").on(table.patientId, table.variableCategory, table.isActive),
    // Performance indexes
    nameCategoryIdx: index("patient_variables_name_category_idx").on(table.variableName, table.variableCategory),
  })
);

// ===== CONVERSATION STATE MANAGEMENT =====

export const conversationStates = pgTable(
  "conversation_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    phoneNumber: text("phone_number").notNull(),
    currentContext: text("current_context").notNull(), // 'verification', 'reminder_confirmation', 'general_inquiry', 'emergency'
    expectedResponseType: text("expected_response_type"), // 'yes_no', 'confirmation', 'text', 'number'
    relatedEntityId: uuid("related_entity_id"), // reminder_log_id, verification_id, etc.
    relatedEntityType: text("related_entity_type"), // 'reminder_log', 'verification', 'general'
    stateData: jsonb("state_data"), // Additional context data as JSON
    lastMessage: text("last_message"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    messageCount: integer("message_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
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
    patientIdIdx: index("conversation_states_patient_id_idx").on(
      table.patientId
    ),
    phoneNumberIdx: index("conversation_states_phone_number_idx").on(
      table.phoneNumber
    ),
    currentContextIdx: index("conversation_states_current_context_idx").on(
      table.currentContext
    ),
    isActiveIdx: index("conversation_states_is_active_idx").on(table.isActive),
    expiresAtIdx: index("conversation_states_expires_at_idx").on(
      table.expiresAt
    ),
    patientActiveIdx: index("conversation_states_patient_active_idx").on(
      table.patientId,
      table.isActive
    ),
    contextActiveIdx: index("conversation_states_context_active_idx").on(
      table.currentContext,
      table.isActive
    ),
    deletedAtIdx: index("conversation_states_deleted_at_idx").on(
      table.deletedAt
    ),
    // Composite indexes for common queries
    patientContextActiveIdx: index(
      "conversation_states_patient_context_active_idx"
    ).on(table.patientId, table.currentContext, table.isActive),
  })
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationStateId: uuid("conversation_state_id")
      .notNull()
      .references(() => conversationStates.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    direction: text("direction").notNull(), // 'inbound', 'outbound'
    messageType: text("message_type").notNull(), // 'verification', 'reminder', 'confirmation', 'general'
    intent: text("intent"), // Detected intent from NLP
    confidence: integer("confidence"), // Confidence score (0-100)
    processedAt: timestamp("processed_at", { withTimezone: true }),
    // LLM-specific fields for conversation history
    llmResponseId: text("llm_response_id"), // LLM response identifier
    llmModel: text("llm_model"), // Model used (e.g., 'glm-4.5')
    llmTokensUsed: integer("llm_tokens_used"), // Tokens consumed
    llmCost: decimal("llm_cost", { precision: 10, scale: 6 }), // Cost in USD
    llmResponseTimeMs: integer("llm_response_time_ms"), // Response time in milliseconds
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationStateIdIdx: index(
      "conversation_messages_conversation_state_id_idx"
    ).on(table.conversationStateId),
    directionIdx: index("conversation_messages_direction_idx").on(
      table.direction
    ),
    messageTypeIdx: index("conversation_messages_message_type_idx").on(
      table.messageType
    ),
    createdAtIdx: index("conversation_messages_created_at_idx").on(
      table.createdAt
    ),
    // Composite indexes
    conversationDirectionIdx: index(
      "conversation_messages_conversation_direction_idx"
    ).on(table.conversationStateId, table.direction),
    typeCreatedIdx: index("conversation_messages_type_created_idx").on(
      table.messageType,
      table.createdAt
    ),
  })
);

export const verificationLogs = pgTable(
  "verification_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    action: text("action").notNull(), // 'sent', 'responded', 'manual_verified', 'expired'
    messageSent: text("message_sent"),
    patientResponse: text("patient_response"),
    verificationResult: verificationStatusEnum("verification_result"),
    processedBy: uuid("processed_by"), // volunteer who processed manual verification
    additionalInfo: jsonb("additional_info"), // Store LLM analysis results and other metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientLogIdx: index("verification_logs_patient_idx").on(table.patientId),
    createdAtIdx: index("verification_logs_created_at_idx").on(table.createdAt),
    actionIdx: index("verification_logs_action_idx").on(table.action),
  })
);

// ===== LLM RESPONSE CACHE =====

export const llmResponseCache = pgTable(
  "llm_response_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageHash: text("message_hash").notNull(),
    patientContextHash: text("patient_context_hash").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    messageHashIdx: index("llm_response_cache_message_hash_idx").on(table.messageHash),
    patientContextHashIdx: index("llm_response_cache_patient_context_hash_idx").on(table.patientContextHash),
    expiresAtIdx: index("llm_response_cache_expires_at_idx").on(table.expiresAt),
    // Composite unique index for cache lookup
    messagePatientUniqueIdx: index("llm_response_cache_message_patient_unique_idx")
      .on(table.messageHash, table.patientContextHash),
  })
);

// ===== VOLUNTEER NOTIFICATIONS =====

export const volunteerNotifications = pgTable(
  "volunteer_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    message: text("message").notNull(),
    priority: text("priority").notNull(), // 'emergency', 'high', 'medium', 'low'
    status: text("status").notNull().default("pending"), // 'pending', 'assigned', 'responded', 'resolved', 'dismissed'
    assignedVolunteerId: uuid("assigned_volunteer_id"),
    escalationReason: text("escalation_reason").notNull(), // 'emergency_detection', 'low_confidence', 'complex_inquiry'
    confidence: integer("confidence"), // Confidence score for low_confidence escalations
    intent: text("intent"), // Detected intent that triggered escalation
    patientContext: jsonb("patient_context"), // Patient context at time of escalation
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
    priorityIdx: index("volunteer_notifications_priority_idx").on(table.priority),
    statusIdx: index("volunteer_notifications_status_idx").on(table.status),
    assignedVolunteerIdx: index("volunteer_notifications_assigned_volunteer_idx").on(table.assignedVolunteerId),
    escalationReasonIdx: index("volunteer_notifications_escalation_reason_idx").on(table.escalationReason),
    createdAtIdx: index("volunteer_notifications_created_at_idx").on(table.createdAt),
    // Composite indexes for common queries
    statusPriorityIdx: index("volunteer_notifications_status_priority_idx").on(table.status, table.priority),
    assignedStatusIdx: index("volunteer_notifications_assigned_status_idx").on(table.assignedVolunteerId, table.status),
    patientStatusIdx: index("volunteer_notifications_patient_status_idx").on(table.patientId, table.status),
  })
);