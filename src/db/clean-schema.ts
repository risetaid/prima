/**
 * PRIMA Database Schema v2.0 - Clean & Focused
 *
 * This is a streamlined schema containing only the essential 12 tables
 * for the PRIMA healthcare management system.
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  jsonb,
  time,
  date,
  index,
} from "drizzle-orm/pg-core";

// ===== ENUMS =====

export const cancerStageEnum = text("cancer_stage", {
  enum: ["I", "II", "III", "IV"],
});

export const verificationStatusEnum = text("verification_status", {
  enum: [
    "pending_verification",
    "verified",
    "declined",
    "expired",
    "unsubscribed",
  ],
});

export const userRoleEnum = text("role", {
  enum: ["SUPERADMIN", "ADMIN", "RELAWAN"],
});

export const reminderFrequencyEnum = text("frequency", {
  enum: ["once_daily", "twice_daily", "custom"],
});

export const reminderStatusEnum = text("status", {
  enum: ["pending", "sent", "delivered", "failed", "confirmed"],
});

export const confirmationStatusEnum = text("confirmation_status", {
  enum: ["pending", "confirmed", "declined"],
});

export const variableCategoryEnum = text("variable_category", {
  enum: ["PERSONAL", "MEDICAL", "MEDICATION", "CAREGIVER", "HOSPITAL", "OTHER"],
});

export const contentTypeEnum = text("content_type", {
  enum: ["article", "video"],
});

// ===== TABLES =====

// 1. Core System - Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").unique().notNull(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: userRoleEnum.notNull().default("RELAWAN"),
    hospitalName: text("hospital_name"),
    isActive: boolean("is_active").notNull().default(true),
    isApproved: boolean("is_approved").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clerkIdIdx: index("users_clerk_id_idx").on(table.clerkId),
    roleIdx: index("users_role_idx").on(table.role),
    isActiveIdx: index("users_is_active_idx").on(table.isActive),
    isApprovedIdx: index("users_is_approved_idx").on(table.isApproved),
    roleActiveApprovedIdx: index("users_role_active_approved_idx").on(
      table.role,
      table.isActive,
      table.isApproved
    ),
    clerkApprovedActiveIdx: index("users_clerk_approved_active_idx").on(
      table.clerkId,
      table.isApproved,
      table.isActive
    ),
    lastLoginIdx: index("users_last_login_idx").on(table.lastLoginAt),
    deletedAtIdx: index("users_deleted_at_idx").on(table.deletedAt),
  })
);

// 2. Core System - Patients
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phoneNumber: text("phone_number").notNull(),
    address: text("address"),
    birthDate: timestamp("birth_date", { withTimezone: true }),
    diagnosisDate: timestamp("diagnosis_date", { withTimezone: true }),
    cancerStage: cancerStageEnum,
    assignedVolunteerId: uuid("assigned_volunteer_id").references(
      () => users.id
    ),
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

    // Verification fields
    verificationStatus: verificationStatusEnum
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

    // Unsubscribe tracking
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    unsubscribeReason: text("unsubscribe_reason"),
    unsubscribeMethod: text("unsubscribe_method"),
    lastReactivatedAt: timestamp("last_reactivated_at", { withTimezone: true }),

    // Photo
    photoUrl: text("photo_url"),
  },
  (table) => ({
    assignedVolunteerIdx: index("patients_assigned_volunteer_idx").on(
      table.assignedVolunteerId
    ),
    isActiveIdx: index("patients_is_active_idx").on(table.isActive),
    phoneNumberIdx: index("patients_phone_number_idx").on(table.phoneNumber),
    createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
    verificationStatusIdx: index("patients_verification_status_idx").on(
      table.verificationStatus
    ),
    verificationStatusActiveIdx: index(
      "patients_verification_status_active_idx"
    ).on(table.verificationStatus, table.isActive),
    deletedAtIdx: index("patients_deleted_at_idx").on(table.deletedAt),
    assignedDeletedActiveIdx: index("patients_assigned_deleted_active_idx").on(
      table.assignedVolunteerId,
      table.deletedAt,
      table.isActive
    ),
    unsubscribedAtIdx: index("patients_unsubscribed_at_idx").on(
      table.unsubscribedAt
    ),
    lastReactivatedAtIdx: index("patients_last_reactivated_at_idx").on(
      table.lastReactivatedAt
    ),
  })
);

// 3. Core System - Verification Logs
export const verificationLogs = pgTable(
  "verification_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // 'sent', 'responded', 'manual_verified', 'expired', 'reactivated'
    messageSent: text("message_sent"),
    patientResponse: text("patient_response"),
    verificationResult: verificationStatusEnum,
    processedBy: uuid("processed_by").references(() => users.id),
    additionalInfo: jsonb("additional_info"), // Store LLM analysis results and metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientLogIdx: index("verification_logs_patient_idx").on(table.patientId),
    createdAtIdx: index("verification_logs_created_at_idx").on(table.createdAt),
    actionIdx: index("verification_logs_action_idx").on(table.action),
    additionalInfoIdx: index("verification_logs_additional_info_idx").on(
      table.additionalInfo
    ),
  })
);

// 4. Core System - Audit Logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: text("action").notNull(), // 'create', 'update', 'delete', 'login', 'export'
    resourceType: text("resource_type").notNull(), // 'patient', 'user', 'reminder'
    resourceId: uuid("resource_id"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    patientId: uuid("patient_id").references(() => patients.id), // For patient-related actions
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    sessionId: text("session_id"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actionIdx: index("audit_logs_action_idx").on(table.action),
    resourceTypeIdx: index("audit_logs_resource_type_idx").on(
      table.resourceType
    ),
    resourceIdIdx: index("audit_logs_resource_id_idx").on(table.resourceId),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    patientIdIdx: index("audit_logs_patient_id_idx").on(table.patientId),
    timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
    userActionIdx: index("audit_logs_user_action_idx").on(
      table.userId,
      table.action
    ),
    resourceActionIdx: index("audit_logs_resource_action_idx").on(
      table.resourceType,
      table.action
    ),
    userTimestampIdx: index("audit_logs_user_timestamp_idx").on(
      table.userId,
      table.timestamp
    ),
    patientActionIdx: index("audit_logs_patient_action_idx").on(
      table.patientId,
      table.action
    ),
  })
);

// 5. Patient Care - Health Notes
export const healthNotes = pgTable(
  "health_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
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

// 6. Patient Care - Patient Variables
export const patientVariables = pgTable(
  "patient_variables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    variableName: text("variable_name").notNull(), // 'obat', 'dosis', 'nama_keluarga', etc.
    variableValue: text("variable_value").notNull(),
    variableCategory: variableCategoryEnum.notNull().default("PERSONAL"),
    variableMetadata: jsonb("variable_metadata"), // Additional structured data
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
    variableCategoryIdx: index("patient_variables_category_idx").on(
      table.variableCategory
    ),
    patientCategoryIdx: index("patient_variables_patient_category_idx").on(
      table.patientId,
      table.variableCategory
    ),
    patientCategoryActiveIdx: index(
      "patient_variables_patient_category_active_idx"
    ).on(table.patientId, table.variableCategory, table.isActive),
    nameCategoryIdx: index("patient_variables_name_category_idx").on(
      table.variableName,
      table.variableCategory
    ),
  })
);

// 7. Patient Care - Manual Confirmations
export const manualConfirmations = pgTable(
  "manual_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    volunteerId: uuid("volunteer_id")
      .notNull()
      .references(() => users.id),
    reminderScheduleId: uuid("reminder_schedule_id").references(
      () => reminderSchedules.id
    ),
    reminderLogId: uuid("reminder_log_id").references(() => reminderLogs.id),
    visitDate: date("visit_date").notNull(),
    visitTime: time("visit_time"),
    patientCondition: text("patient_condition"), // 'baik', 'sakit_ringan', 'sakit_berat', 'meninggal'
    notes: text("notes"),
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
    visitDateIdx: index("manual_confirmations_visit_date_idx").on(
      table.visitDate
    ),
    patientVisitDateIdx: index(
      "manual_confirmations_patient_visit_date_idx"
    ).on(table.patientId, table.visitDate),
  })
);

// 8. Patient Care - Reminder Logs
export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderScheduleId: uuid("reminder_schedule_id")
      .notNull()
      .references(() => reminderSchedules.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: reminderStatusEnum.notNull().default("pending"),
    confirmationStatus: confirmationStatusEnum.default("pending"),
    confirmationResponse: text("confirmation_response"), // Patient's response: 'SUDAH', 'BELUM', 'BESOK'
    medicationsTaken: text("medications_taken").array(), // Array of medication names taken
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    reminderScheduleIdx: index("reminder_logs_reminder_schedule_idx").on(
      table.reminderScheduleId
    ),
    patientIdIdx: index("reminder_logs_patient_id_idx").on(table.patientId),
    statusIdx: index("reminder_logs_status_idx").on(table.status),
    sentAtIdx: index("reminder_logs_sent_at_idx").on(table.sentAt),
    confirmationStatusIdx: index("reminder_logs_confirmation_status_idx").on(
      table.confirmationStatus
    ),
    patientStatusIdx: index("reminder_logs_patient_status_idx").on(
      table.patientId,
      table.status
    ),
    patientSentAtIdx: index("reminder_logs_patient_sent_at_idx").on(
      table.patientId,
      table.sentAt
    ),
  })
);

// 9. Reminder System - Reminder Schedules
export const reminderSchedules = pgTable(
  "reminder_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    medicationName: text("medication_name").notNull(),
    dosage: text("dosage").notNull(),
    frequency: reminderFrequencyEnum.notNull().default("once_daily"),
    scheduledTime: time("scheduled_time").notNull(),
    customMessage: text("custom_message"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
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
    startDateIdx: index("reminder_schedules_start_date_idx").on(
      table.startDate
    ),
    endDateIdx: index("reminder_schedules_end_date_idx").on(table.endDate),
    patientActiveIdx: index("reminder_schedules_patient_active_idx").on(
      table.patientId,
      table.isActive
    ),
    patientStartDateIdx: index("reminder_schedules_patient_start_date_idx").on(
      table.patientId,
      table.startDate
    ),
    deletedAtIdx: index("reminder_schedules_deleted_at_idx").on(
      table.deletedAt
    ),
  })
);

// 10. Reminder System - Content Attachments
export const reminderContentAttachments = pgTable(
  "reminder_content_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminderScheduleId: uuid("reminder_schedule_id")
      .notNull()
      .references(() => reminderSchedules.id, { onDelete: "cascade" }),
    contentType: contentTypeEnum.notNull(), // 'article', 'video'
    contentId: text("content_id").notNull(), // cms_articles.id or cms_videos.id
    attachedAt: timestamp("attached_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    attachedBy: uuid("attached_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => ({
    reminderScheduleIdx: index(
      "reminder_content_attachments_reminder_schedule_idx"
    ).on(table.reminderScheduleId),
    contentTypeIdx: index("reminder_content_attachments_content_type_idx").on(
      table.contentType
    ),
    contentIdIdx: index("reminder_content_attachments_content_id_idx").on(
      table.contentId
    ),
    attachedByIdx: index("reminder_content_attachments_attached_by_idx").on(
      table.attachedBy
    ),
  })
);

// 11. Content Management - Articles
export const cmsArticles = pgTable(
  "cms_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").unique().notNull(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    category: text("category").notNull().default("general"),
    tags: text("tags").array(),
    featuredImageUrl: text("featured_image_url"),
    authorId: uuid("author_id").references(() => users.id),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    viewCount: integer("view_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    slugIdx: index("cms_articles_slug_idx").on(table.slug),
    categoryIdx: index("cms_articles_category_idx").on(table.category),
    isPublishedIdx: index("cms_articles_is_published_idx").on(
      table.isPublished
    ),
    publishedAtIdx: index("cms_articles_published_at_idx").on(
      table.publishedAt
    ),
    authorIdIdx: index("cms_articles_author_id_idx").on(table.authorId),
    deletedAtIdx: index("cms_articles_deleted_at_idx").on(table.deletedAt),
  })
);

// 12. Content Management - Videos
export const cmsVideos = pgTable(
  "cms_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    youtubeVideoId: text("youtube_video_id").unique().notNull(),
    description: text("description"),
    category: text("category").notNull().default("general"),
    tags: text("tags").array(),
    durationSeconds: integer("duration_seconds"),
    thumbnailUrl: text("thumbnail_url"),
    authorId: uuid("author_id").references(() => users.id),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    viewCount: integer("view_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    youtubeVideoIdIdx: index("cms_videos_youtube_video_id_idx").on(
      table.youtubeVideoId
    ),
    categoryIdx: index("cms_videos_category_idx").on(table.category),
    isPublishedIdx: index("cms_videos_is_published_idx").on(table.isPublished),
    publishedAtIdx: index("cms_videos_published_at_idx").on(table.publishedAt),
    authorIdIdx: index("cms_videos_author_id_idx").on(table.authorId),
    deletedAtIdx: index("cms_videos_deleted_at_idx").on(table.deletedAt),
  })
);

// ===== RELATIONS =====

import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ one, many }) => ({
  patientsManaged: many(patients),
  reminderSchedulesCreated: many(reminderSchedules),
  manualConfirmations: many(manualConfirmations),
  healthNotesRecorded: many(healthNotes),
  patientVariablesCreated: many(patientVariables),
  cmsArticlesAuthored: many(cmsArticles),
  cmsVideosAuthored: many(cmsVideos),
  auditLogs: many(auditLogs),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  assignedVolunteer: one(users, {
    fields: [patients.assignedVolunteerId],
    references: [users.id],
  }),
  reminderSchedules: many(reminderSchedules),
  reminderLogs: many(reminderLogs),
  manualConfirmations: many(manualConfirmations),
  healthNotes: many(healthNotes),
  patientVariables: many(patientVariables),
  verificationLogs: many(verificationLogs),
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

export const reminderLogsRelations = relations(reminderLogs, ({ one }) => ({
  reminderSchedule: one(reminderSchedules, {
    fields: [reminderLogs.reminderScheduleId],
    references: [reminderSchedules.id],
  }),
  patient: one(patients, {
    fields: [reminderLogs.patientId],
    references: [patients.id],
  }),
}));

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

export const reminderContentAttachmentsRelations = relations(
  reminderContentAttachments,
  ({ one }) => ({
    reminderSchedule: one(reminderSchedules, {
      fields: [reminderContentAttachments.reminderScheduleId],
      references: [reminderSchedules.id],
    }),
    attachedByUser: one(users, {
      fields: [reminderContentAttachments.attachedBy],
      references: [users.id],
    }),
  })
);

export const cmsArticlesRelations = relations(cmsArticles, ({ one }) => ({
  author: one(users, {
    fields: [cmsArticles.authorId],
    references: [users.id],
  }),
}));

export const cmsVideosRelations = relations(cmsVideos, ({ one }) => ({
  author: one(users, {
    fields: [cmsVideos.authorId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [auditLogs.patientId],
    references: [patients.id],
  }),
}));

// ===== TYPE EXPORTS =====

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type VerificationLog = typeof verificationLogs.$inferSelect;
export type NewVerificationLog = typeof verificationLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type HealthNote = typeof healthNotes.$inferSelect;
export type NewHealthNote = typeof healthNotes.$inferInsert;
export type PatientVariable = typeof patientVariables.$inferSelect;
export type NewPatientVariable = typeof patientVariables.$inferInsert;
export type ManualConfirmation = typeof manualConfirmations.$inferSelect;
export type NewManualConfirmation = typeof manualConfirmations.$inferInsert;
export type ReminderLog = typeof reminderLogs.$inferSelect;
export type NewReminderLog = typeof reminderLogs.$inferInsert;
export type ReminderSchedule = typeof reminderSchedules.$inferSelect;
export type NewReminderSchedule = typeof reminderSchedules.$inferInsert;
export type ReminderContentAttachment =
  typeof reminderContentAttachments.$inferSelect;
export type NewReminderContentAttachment =
  typeof reminderContentAttachments.$inferInsert;
export type CmsArticle = typeof cmsArticles.$inferSelect;
export type NewCmsArticle = typeof cmsArticles.$inferInsert;
export type CmsVideo = typeof cmsVideos.$inferSelect;
export type NewCmsVideo = typeof cmsVideos.$inferInsert;
