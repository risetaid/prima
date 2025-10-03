import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";

// Import clean enums
import {
  userRoleEnum,
  cancerStageEnum,
  medicalRecordTypeEnum,
  verificationStatusEnum,
} from "@/db/enums";

// Re-export enums for convenience
export {
  userRoleEnum,
  cancerStageEnum,
  medicalRecordTypeEnum,
  verificationStatusEnum,
};

// ===== CORE TABLES =====

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
    clerkIdIdx: index("users_clerk_id_idx").on(table.clerkId),
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
      .default("PENDING"),
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
    phoneNumberIdx: index("patients_phone_number_idx").on(table.phoneNumber),
    createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
    verificationStatusIdx: index("patients_verification_status_idx").on(
      table.verificationStatus
    ),
    deletedAtIdx: index("patients_deleted_at_idx").on(table.deletedAt),
    // Foreign key to users
    assignedVolunteerFk: foreignKey({
      columns: [table.assignedVolunteerId],
      foreignColumns: [users.id],
      name: "patients_assigned_volunteer_id_users_id_fk",
    }),
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
    // Foreign key to users
    recordedByFk: foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: "medical_records_recorded_by_users_id_fk",
    }),
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
    // Foreign key to users
    recordedByFk: foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: "health_notes_recorded_by_users_id_fk",
    }),
  })
);

// ===== TYPE EXPORTS =====
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;
export type HealthNote = typeof healthNotes.$inferSelect;
export type NewHealthNote = typeof healthNotes.$inferInsert;