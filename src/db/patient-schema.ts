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
  cancerStageEnum,
  medicalRecordTypeEnum,
  verificationStatusEnum,
} from "./enums";

// Re-export enums for convenience
export {
  cancerStageEnum,
  medicalRecordTypeEnum,
  verificationStatusEnum,
};

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