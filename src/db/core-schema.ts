import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";

// Import enums
import {
  userRoleEnum,
  cancerStageEnum,
  medicalRecordTypeEnum,
  frequencyEnum,
  reminderStatusEnum,
  confirmationStatusEnum,
  patientConditionEnum,
  templateCategoryEnum,
  verificationStatusEnum,
  contentCategoryEnum,
  contentStatusEnum,
} from "./enums";

// Re-export enums for convenience
export {
  userRoleEnum,
  cancerStageEnum,
  medicalRecordTypeEnum,
  frequencyEnum,
  reminderStatusEnum,
  confirmationStatusEnum,
  patientConditionEnum,
  templateCategoryEnum,
  verificationStatusEnum,
  contentCategoryEnum,
  contentStatusEnum,
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

