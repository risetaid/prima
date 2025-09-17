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

// Followup Enums
export const followupStatusEnum = pgEnum("followup_status", [
  "PENDING",
  "SCHEDULED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "COMPLETED",
  "CANCELLED",
  "ESCALATED",
  "NEEDS_ATTENTION",
  "RESPONDED",
]);
export const followupTypeEnum = pgEnum("followup_type", [
  "REMINDER_CONFIRMATION",
  "MEDICATION_COMPLIANCE",
  "SYMPTOM_CHECK",
  "GENERAL_WELLBEING",
]);

// Medication-related enums
export const medicationCategoryEnum = pgEnum("medication_category", [
  "CHEMOTHERAPY",
  "TARGETED_THERAPY",
  "IMMUNOTHERAPY",
  "HORMONAL_THERAPY",
  "PAIN_MANAGEMENT",
  "ANTIEMETIC",
  "ANTIBIOTIC",
  "ANTIVIRAL",
  "ANTIFUNGAL",
  "SUPPLEMENT",
  "OTHER",
]);

export const medicationFormEnum = pgEnum("medication_form", [
  "TABLET",
  "CAPSULE",
  "LIQUID",
  "INJECTION",
  "INFUSION",
  "CREAM",
  "PATCH",
  "INHALER",
  "SPRAY",
  "OTHER",
]);

export const medicationFrequencyEnum = pgEnum("medication_frequency", [
  "ONCE_DAILY",
  "TWICE_DAILY",
  "THREE_TIMES_DAILY",
  "FOUR_TIMES_DAILY",
  "EVERY_8_HOURS",
  "EVERY_12_HOURS",
  "EVERY_24_HOURS",
  "EVERY_WEEK",
  "EVERY_MONTH",
  "AS_NEEDED",
  "CUSTOM",
]);

export const medicationTimingEnum = pgEnum("medication_timing", [
  "BEFORE_MEAL",
  "WITH_MEAL",
  "AFTER_MEAL",
  "BEDTIME",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "ANYTIME",
]);

export const medicationUnitEnum = pgEnum("medication_unit", [
  "MG",
  "G",
  "ML",
  "MCG",
  "IU",
  "TABLET",
  "CAPSULE",
  "DOSE",
  "PUFF",
  "DROP",
  "PATCH",
  "OTHER",
]);