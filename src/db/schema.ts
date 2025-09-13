import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  pgEnum,
  index,
  foreignKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ===== ENUMS =====
export const userRoleEnum = pgEnum("user_role", [
  "DEVELOPER",
  "ADMIN",
  "RELAWAN",
]);
export const cancerStageEnum = pgEnum("cancer_stage", ["I", "II", "III", "IV"]);
export const medicalRecordTypeEnum = pgEnum("medical_record_type", [
  "DIAGNOSIS",
  "TREATMENT",
  "PROGRESS",
  "HEALTH_NOTE",
]);
export const frequencyEnum = pgEnum("frequency", [
  "CUSTOM",
  "CUSTOM_RECURRENCE",
]);
export const reminderStatusEnum = pgEnum("reminder_status", [
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
]);
export const confirmationStatusEnum = pgEnum("confirmation_status", [
  "PENDING",
  "SENT",
  "CONFIRMED",
  "MISSED",
  "UNKNOWN",
]);
export const patientConditionEnum = pgEnum("patient_condition", [
  "GOOD",
  "FAIR",
  "POOR",
]);
export const templateCategoryEnum = pgEnum("template_category", [
  "REMINDER",
  "APPOINTMENT",
  "EDUCATIONAL",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending_verification",
  "verified",
  "declined",
  "expired",
  "unsubscribed",
]);

// CMS Content Enums
export const contentCategoryEnum = pgEnum("content_category", [
  "general",
  "nutrisi",
  "olahraga",
  "motivational",
  "medical",
  "faq",
  "testimoni",
]);
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
  "archived",
]);

// ===== TABLES =====

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    hospitalName: text("hospital_name"),
    role: userRoleEnum("role").notNull().default("RELAWAN"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    isApproved: boolean("is_approved").notNull().default(false),
    clerkId: text("clerk_id").notNull().unique(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    roleIdx: index("users_role_idx").on(table.role),
    isActiveIdx: index("users_is_active_idx").on(table.isActive),
    isApprovedIdx: index("users_is_approved_idx").on(table.isApproved),
    roleActiveApprovedIdx: index("users_role_active_approved_idx").on(
      table.role,
      table.isActive,
      table.isApproved
    ),
    clerkIdApprovedActiveIdx: index("users_clerk_approved_active_idx").on(
      table.clerkId,
      table.isApproved,
      table.isActive
    ),
    lastLoginIdx: index("users_last_login_idx").on(table.lastLoginAt),
    deletedAtIdx: index("users_deleted_at_idx").on(table.deletedAt),
    // Self-reference foreign key for approvedBy
    approvedByFk: foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [table.id],
      name: "users_approved_by_users_id_fk",
    }),
  })
);

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
    assignedVolunteerId: uuid("assigned_volunteer_id").references(
      () => users.id
    ),
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
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id),
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

export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const patientMedications = pgTable(
  "patient_medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id),
    dosage: text("dosage").notNull(),
    frequency: text("frequency").notNull(),
    instructions: text("instructions"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdIdx: index("patient_medications_patient_id_idx").on(
      table.patientId
    ),
    medicationIdIdx: index("patient_medications_medication_id_idx").on(
      table.medicationId
    ),
    isActiveIdx: index("patient_medications_is_active_idx").on(table.isActive),
    patientActiveIdx: index("patient_medications_patient_active_idx").on(
      table.patientId,
      table.isActive
    ),
    startDateIdx: index("patient_medications_start_date_idx").on(
      table.startDate
    ),
  })
);

export const reminderSchedules = pgTable(
  "reminder_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    medicationName: text("medication_name").notNull(),
    dosage: text("dosage"),
    doctorName: text("doctor_name"),
    scheduledTime: text("scheduled_time").notNull(),
    frequency: frequencyEnum("frequency").notNull().default("CUSTOM"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    customMessage: text("custom_message"),
    isActive: boolean("is_active").notNull().default(true),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
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
    reminderScheduleId: uuid("reminder_schedule_id").references(
      () => reminderSchedules.id
    ),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
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
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    volunteerId: uuid("volunteer_id")
      .notNull()
      .references(() => users.id),
    reminderScheduleId: uuid("reminder_schedule_id").references(
      () => reminderSchedules.id
    ),
    reminderLogId: uuid("reminder_log_id").references(() => reminderLogs.id),
    visitDate: timestamp("visit_date", { withTimezone: true }).notNull(),
    visitTime: text("visit_time").notNull(),
    medicationsTaken: boolean("medications_taken").notNull(),
    medicationsMissed: text("medications_missed").array().notNull().default([]),
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
    medicationsTakenIdx: index("manual_confirmations_medications_taken_idx").on(
      table.medicationsTaken
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
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
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

export const healthNotes = pgTable(
  "health_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    note: text("note").notNull(),
    noteDate: timestamp("note_date", { withTimezone: true }).notNull(),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id),
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
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
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
    processedBy: uuid("processed_by").references(() => users.id), // volunteer who processed manual verification
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

// ===== CMS CONTENT TABLES =====

export const cmsArticles = pgTable(
  "cms_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    featuredImageUrl: text("featured_image_url"),
    category: contentCategoryEnum("category").notNull().default("general"),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(), // Clerk user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  (table) => ({
    slugIdx: index("cms_articles_slug_idx").on(table.slug),
    statusIdx: index("cms_articles_status_idx").on(table.status),
    categoryIdx: index("cms_articles_category_idx").on(table.category),
    publishedAtIdx: index("cms_articles_published_at_idx").on(
      table.publishedAt
    ),
    statusPublishedIdx: index("cms_articles_status_published_idx").on(
      table.status,
      table.publishedAt
    ),
    categoryStatusIdx: index("cms_articles_category_status_idx").on(
      table.category,
      table.status
    ),
    createdByIdx: index("cms_articles_created_by_idx").on(table.createdBy),
    deletedAtIdx: index("cms_articles_deleted_at_idx").on(table.deletedAt),
    statusDeletedIdx: index("cms_articles_status_deleted_idx").on(
      table.status,
      table.deletedAt
    ),
  })
);

export const cmsVideos = pgTable(
  "cms_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    videoUrl: text("video_url").notNull(), // YouTube/Vimeo embed URL
    thumbnailUrl: text("thumbnail_url"),
    durationMinutes: text("duration_minutes"), // Using text for flexibility (e.g., "5:30")
    category: contentCategoryEnum("category").notNull().default("motivational"),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(), // Clerk user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  (table) => ({
    slugIdx: index("cms_videos_slug_idx").on(table.slug),
    statusIdx: index("cms_videos_status_idx").on(table.status),
    categoryIdx: index("cms_videos_category_idx").on(table.category),
    publishedAtIdx: index("cms_videos_published_at_idx").on(table.publishedAt),
    statusPublishedIdx: index("cms_videos_status_published_idx").on(
      table.status,
      table.publishedAt
    ),
    categoryStatusIdx: index("cms_videos_category_status_idx").on(
      table.category,
      table.status
    ),
    createdByIdx: index("cms_videos_created_by_idx").on(table.createdBy),
    deletedAtIdx: index("cms_videos_deleted_at_idx").on(table.deletedAt),
    statusDeletedIdx: index("cms_videos_status_deleted_idx").on(
      table.status,
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
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
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

// ===== POLL RESPONSES TABLE =====

export const pollResponses = pgTable(
  "poll_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderLogId: uuid("reminder_log_id").references(() => reminderLogs.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pollType: text("poll_type").notNull(), // 'verification', 'medication', 'followup'
    pollName: text("poll_name").notNull(), // 'Verifikasi PRIMA', 'Konfirmasi Obat', 'Follow-up Obat'
    selectedOption: text("selected_option").notNull(),
    responseTime: timestamp("response_time", { withTimezone: true })
      .notNull()
      .defaultNow(),
    messageId: text("message_id"), // Fonnte message ID
    pollData: jsonb("poll_data"), // Full poll response data from Fonnte
    phoneNumber: text("phone_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdIdx: index("poll_responses_patient_id_idx").on(table.patientId),
    reminderLogIdIdx: index("poll_responses_reminder_log_id_idx").on(
      table.reminderLogId
    ),
    pollTypeIdx: index("poll_responses_poll_type_idx").on(table.pollType),
    responseTimeIdx: index("poll_responses_response_time_idx").on(
      table.responseTime
    ),
    phoneNumberIdx: index("poll_responses_phone_number_idx").on(
      table.phoneNumber
    ),
  })
);

// ===== RELATIONS =====

export const usersRelations = relations(users, ({ one, many }) => ({
  approver: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
    relationName: "UserApprovals",
  }),
  approvedUsers: many(users, {
    relationName: "UserApprovals",
  }),
  patientsManaged: many(patients),
  reminderSchedulesCreated: many(reminderSchedules),
  whatsappTemplatesCreated: many(whatsappTemplates),
  manualConfirmations: many(manualConfirmations),
  medicalRecords: many(medicalRecords),
  patientMedicationsCreated: many(patientMedications),
  healthNotesRecorded: many(healthNotes),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  assignedVolunteer: one(users, {
    fields: [patients.assignedVolunteerId],
    references: [users.id],
  }),
  reminderSchedules: many(reminderSchedules),
  reminderLogs: many(reminderLogs),
  manualConfirmations: many(manualConfirmations),
  medicalRecords: many(medicalRecords),
  patientMedications: many(patientMedications),
  healthNotes: many(healthNotes),
  patientVariables: many(patientVariables),
  verificationLogs: many(verificationLogs),
  conversationStates: many(conversationStates),
  pollResponses: many(pollResponses),
}));

export const reminderSchedulesRelations = relations(
  reminderSchedules,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [reminderSchedules.patientId],
      references: [patients.id],
    }),
    createdByUser: one(users, {
      fields: [reminderSchedules.createdById],
      references: [users.id],
    }),
    reminderLogs: many(reminderLogs),
    manualConfirmations: many(manualConfirmations),
    contentAttachments: many(reminderContentAttachments),
  })
);

export const conversationStatesRelations = relations(
  conversationStates,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [conversationStates.patientId],
      references: [patients.id],
    }),
    messages: many(conversationMessages),
  })
);

export const conversationMessagesRelations = relations(
  conversationMessages,
  ({ one }) => ({
    conversationState: one(conversationStates, {
      fields: [conversationMessages.conversationStateId],
      references: [conversationStates.id],
    }),
  })
);

export const reminderContentAttachmentsRelations = relations(
  reminderContentAttachments,
  ({ one }) => ({
    reminderSchedule: one(reminderSchedules, {
      fields: [reminderContentAttachments.reminderScheduleId],
      references: [reminderSchedules.id],
    }),
    createdByUser: one(users, {
      fields: [reminderContentAttachments.createdBy],
      references: [users.id],
    }),
  })
);

export const reminderLogsRelations = relations(
  reminderLogs,
  ({ one, many }) => ({
    reminderSchedule: one(reminderSchedules, {
      fields: [reminderLogs.reminderScheduleId],
      references: [reminderSchedules.id],
    }),
    patient: one(patients, {
      fields: [reminderLogs.patientId],
      references: [patients.id],
    }),
    manualConfirmations: many(manualConfirmations),
    pollResponses: many(pollResponses),
  })
);

export const manualConfirmationsRelations = relations(
  manualConfirmations,
  ({ one }) => ({
    patient: one(patients, {
      fields: [manualConfirmations.patientId],
      references: [patients.id],
    }),
    volunteer: one(users, {
      fields: [manualConfirmations.volunteerId],
      references: [users.id],
    }),
    reminderSchedule: one(reminderSchedules, {
      fields: [manualConfirmations.reminderScheduleId],
      references: [reminderSchedules.id],
    }),
    reminderLog: one(reminderLogs, {
      fields: [manualConfirmations.reminderLogId],
      references: [reminderLogs.id],
    }),
  })
);

export const whatsappTemplatesRelations = relations(
  whatsappTemplates,
  ({ one }) => ({
    createdByUser: one(users, {
      fields: [whatsappTemplates.createdBy],
      references: [users.id],
    }),
  })
);

export const healthNotesRelations = relations(healthNotes, ({ one }) => ({
  patient: one(patients, {
    fields: [healthNotes.patientId],
    references: [patients.id],
  }),
  recordedByUser: one(users, {
    fields: [healthNotes.recordedBy],
    references: [users.id],
  }),
}));

export const patientVariablesRelations = relations(
  patientVariables,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientVariables.patientId],
      references: [patients.id],
    }),
    createdByUser: one(users, {
      fields: [patientVariables.createdById],
      references: [users.id],
    }),
  })
);

export const verificationLogsRelations = relations(
  verificationLogs,
  ({ one }) => ({
    patient: one(patients, {
      fields: [verificationLogs.patientId],
      references: [patients.id],
    }),
    processedByUser: one(users, {
      fields: [verificationLogs.processedBy],
      references: [users.id],
    }),
  })
);

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  recordedByUser: one(users, {
    fields: [medicalRecords.recordedBy],
    references: [users.id],
  }),
}));

export const patientMedicationsRelations = relations(
  patientMedications,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientMedications.patientId],
      references: [patients.id],
    }),
    medication: one(medications, {
      fields: [patientMedications.medicationId],
      references: [medications.id],
    }),
    createdByUser: one(users, {
      fields: [patientMedications.createdBy],
      references: [users.id],
    }),
  })
);

export const cmsArticlesRelations = relations(cmsArticles, ({ many }) => ({
  contentAttachments: many(reminderContentAttachments),
}));

export const cmsVideosRelations = relations(cmsVideos, ({ many }) => ({
  contentAttachments: many(reminderContentAttachments),
}));

export const medicationsRelations = relations(medications, ({ many }) => ({
  patientMedications: many(patientMedications),
}));

export const pollResponsesRelations = relations(pollResponses, ({ one }) => ({
  reminderLog: one(reminderLogs, {
    fields: [pollResponses.reminderLogId],
    references: [reminderLogs.id],
  }),
  patient: one(patients, {
    fields: [pollResponses.patientId],
    references: [patients.id],
  }),
}));

// ===== TYPE EXPORTS =====
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type ReminderSchedule = typeof reminderSchedules.$inferSelect;
export type NewReminderSchedule = typeof reminderSchedules.$inferInsert;
export type ReminderLog = typeof reminderLogs.$inferSelect;
export type NewReminderLog = typeof reminderLogs.$inferInsert;
export type WhatsAppTemplate = typeof whatsappTemplates.$inferSelect;
export type NewWhatsAppTemplate = typeof whatsappTemplates.$inferInsert;
export type ManualConfirmation = typeof manualConfirmations.$inferSelect;
export type NewManualConfirmation = typeof manualConfirmations.$inferInsert;
export type PatientVariable = typeof patientVariables.$inferSelect;
export type NewPatientVariable = typeof patientVariables.$inferInsert;
export type VerificationLog = typeof verificationLogs.$inferSelect;
export type NewVerificationLog = typeof verificationLogs.$inferInsert;
export type ReminderContentAttachment =
  typeof reminderContentAttachments.$inferSelect;
export type NewReminderContentAttachment =
  typeof reminderContentAttachments.$inferInsert;

// CMS Content Types
export type CmsArticle = typeof cmsArticles.$inferSelect;
export type NewCmsArticle = typeof cmsArticles.$inferInsert;
export type CmsVideo = typeof cmsVideos.$inferSelect;
export type NewCmsVideo = typeof cmsVideos.$inferInsert;

// Poll Response Types
export type PollResponse = typeof pollResponses.$inferSelect;
export type NewPollResponse = typeof pollResponses.$inferInsert;
