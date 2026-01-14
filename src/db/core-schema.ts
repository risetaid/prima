import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
    // Self-reference foreign key for approvedBy
    approvedByFk: foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [table.id],
      name: "users_approved_by_users_id_fk",
    }),
    // Note: Removed redundant single-column indexes (role, isActive, isApproved, clerkId, deletedAt)
    // clerkId and email already have unique constraints which create indexes automatically
    // Other single-column indexes have low cardinality or are rarely queried alone
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
    // Foreign key to users
    assignedVolunteerFk: foreignKey({
      columns: [table.assignedVolunteerId],
      foreignColumns: [users.id],
      name: "patients_assigned_volunteer_id_users_id_fk",
    }),
    // Trigram index for fuzzy name search (case-insensitive ILIKE)
    nameTrgmIdx: index("patients_name_trgm_idx")
      .on(sql`gin_trgm_ops(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    // Trigram index for phone number fuzzy search
    phoneTrgmIdx: index("patients_phone_trgm_idx")
      .on(sql`gin_trgm_ops(${table.phoneNumber})`)
      .where(sql`${table.deletedAt} IS NULL`),
    // Note: Removed redundant single-column indexes
    // isActive, deletedAt, createdAt are low-cardinality or rarely queried alone
    // phoneNumber is queried but not frequently enough to warrant standalone index
    // assignedVolunteerId and verificationStatus can be added back if profiling shows need
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
    // Foreign key to users
    recordedByFk: foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: "medical_records_recorded_by_users_id_fk",
    }),
    // Note: Table is currently empty (0 rows). Add indexes when table has >1000 rows.
    // Removed all indexes: patientId, recordType, recordedDate, recordedBy
    // patientId already has foreign key reference which may be used for lookups
  })
);



// ===== TYPE EXPORTS =====
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;


