// ===== CLEAN ENUMS =====
import { pgEnum } from "drizzle-orm/pg-core";

// User Management
export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "DEVELOPER",
  "RELAWAN",
]);

// Patient Management
export const cancerStageEnum = pgEnum("cancer_stage", [
  "I",
  "II", 
  "III",
  "IV",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "PENDING",
  "VERIFIED",
  "DECLINED",
  "EXPIRED",
]);

// Medical Records
export const medicalRecordTypeEnum = pgEnum("medical_record_type", [
  "DIAGNOSIS",
  "TREATMENT",
  "PROGRESS",
  "HEALTH_NOTE",
]);

// Reminder System
export const reminderStatusEnum = pgEnum("reminder_status", [
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
]);

export const confirmationStatusEnum = pgEnum("confirmation_status", [
  "PENDING",
  "CONFIRMED",
  "MISSED",
]);

export const reminderTypeEnum = pgEnum("reminder_type", [
  "APPOINTMENT",
  "GENERAL",
]);

// Manual Confirmations
export const patientConditionEnum = pgEnum("patient_condition", [
  "GOOD",
  "FAIR",
  "POOR",
]);

// WhatsApp Templates
export const templateCategoryEnum = pgEnum("template_category", [
  "REMINDER",
  "APPOINTMENT",
  "EDUCATIONAL",
]);

// CMS Content
export const contentCategoryEnum = pgEnum("content_category", [
  "GENERAL",
  "NUTRITION",
  "EXERCISE",
  "MOTIVATIONAL",
  "MEDICAL",
  "FAQ",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);