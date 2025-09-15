// ===== ENUMS =====
import { pgEnum } from "drizzle-orm/pg-core";

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