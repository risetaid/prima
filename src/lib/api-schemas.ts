/**
 * Centralized Zod Validation Schemas for PRIMA Medical System
 *
 * This file contains reusable validation schemas for common API patterns
 * across the entire system, following the API Patterns documentation.
 */

import { z } from "zod";

// ===== COMMON PATTERNS =====

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid("Invalid ID format");

/**
 * Pagination schemas
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const offsetSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
});

/**
 * Date and time schemas
 */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, use YYYY-MM-DD");
export const timeStringSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, use HH:MM");
export const isoDateTimeSchema = z.string().datetime("Invalid datetime format");

/**
 * Boolean string schemas
 */
export const booleanStringSchema = z.enum(["true", "false"]).transform(val => val === "true");

/**
 * Search and filter schemas
 */
export const searchSchema = z.object({
  search: z.string().optional(),
});

export const statusFilterSchema = z.object({
  status: z.enum(["active", "inactive", "all"]).default("all"),
});

/**
 * Soft delete schema
 */
export const includeDeletedSchema = z.object({
  includeDeleted: booleanStringSchema.optional(),
});

// ===== ENTITY-SPECIFIC SCHEMAS =====

/**
 * User-related schemas
 */
export const userRoleSchema = z.enum(["ADMIN", "DEVELOPER", "RELAWAN"]);

export const createUserBodySchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  role: userRoleSchema.optional(),
});

export const updateUserBodySchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional(),
});

/**
 * Patient-related schemas
 */
export const createPatientBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().regex(/^62\d{9,12}$/, "Invalid Indonesian phone number"),
  address: z.string().optional(),
  birthDate: dateStringSchema.optional(),
  diagnosisDate: dateStringSchema.optional(),
  cancerStage: z.enum(['I', 'II', 'III', 'IV']).nullable().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
  assignedVolunteerId: uuidSchema.optional(),
});

export const updatePatientBodySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phoneNumber: z.string().regex(/^62\d{9,12}$/, "Invalid Indonesian phone number").optional(),
  address: z.string().optional(),
  birthDate: dateStringSchema.optional(),
  diagnosisDate: dateStringSchema.optional(),
  cancerStage: z.enum(['I', 'II', 'III', 'IV']).nullable().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
  assignedVolunteerId: uuidSchema.optional(),
  isActive: z.boolean().optional(),
  verificationStatus: z.enum(["VERIFIED", "PENDING", "DECLINED", "EXPIRED"]).optional(),
});

/**
 * Reminder-related schemas
 */
export const reminderFrequencySchema = z.enum(["daily", "weekly", "monthly", "custom"]);
export const reminderStatusSchema = z.enum(["PENDING", "SENT", "DELIVERED", "FAILED", "CANCELLED"]);
export const confirmationStatusSchema = z.enum(["PENDING", "CONFIRMED", "MISSED", "DECLINED"]);

export const createReminderBodySchema = z.object({
  message: z.string().min(1, "Message is required"),
  time: timeStringSchema,
  selectedDates: z.array(dateStringSchema).optional(),
  customRecurrence: z.object({
    frequency: z.enum(["day", "week", "month"]),
    interval: z.number().int().min(1),
    occurrences: z.number().int().min(1).max(1000).optional(),
    endType: z.enum(["never", "on", "after"]),
    endDate: dateStringSchema.optional(),
    daysOfWeek: z.array(z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"])).optional(),
  }).optional(),
  attachedContent: z.array(z.object({
    id: z.string(),
    type: z.enum(["article", "video", "ARTICLE", "VIDEO"]),
    title: z.string(),
  })).optional(),
});

export const updateReminderBodySchema = z.object({
  message: z.string().min(1, "Message is required").optional(),
  time: timeStringSchema.optional(),
  isActive: z.boolean().optional(),
});

export const reminderFilterSchema = z.object({
  filter: z.enum(["all", "completed", "pending", "scheduled"]).default("all"),
  date: dateStringSchema.optional(),
});

export const deleteRemindersBodySchema = z.object({
  reminderIds: z.array(uuidSchema).min(1, "At least one reminder ID is required"),
});

export const confirmReminderBodySchema = z.object({
  status: confirmationStatusSchema,
  notes: z.string().optional(),
  confirmedAt: isoDateTimeSchema.optional(),
});

/**
 * Content-related schemas
 */
export const contentTypeSchema = z.enum(["article", "video"]);
export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const createArticleBodySchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  status: contentStatusSchema.default("DRAFT"),
  tags: z.array(z.string()).optional(),
  publishedAt: isoDateTimeSchema.optional(),
});

export const createVideoBodySchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  videoUrl: z.string().url("Invalid video URL"),
  thumbnailUrl: z.string().url().optional(),
  description: z.string().optional(),
  status: contentStatusSchema.default("DRAFT"),
  tags: z.array(z.string()).optional(),
  publishedAt: isoDateTimeSchema.optional(),
});

/**
 * Template-related schemas
 */
export const createTemplateBodySchema = z.object({
  name: z.string().min(1, "Template name is required"),
  message: z.string().min(1, "Template message is required"),
  type: z.enum(["REMINDER", "FOLLOW_UP", "NOTIFICATION"]).default("REMINDER"),
  isActive: z.boolean().default(true),
});

export const updateTemplateBodySchema = z.object({
  name: z.string().min(1, "Template name is required").optional(),
  message: z.string().min(1, "Template message is required").optional(),
  type: z.enum(["REMINDER", "FOLLOW_UP", "NOTIFICATION"]).optional(),
  isActive: z.boolean().optional(),
});

// ===== COMPOSED SCHEMAS =====

/**
 * Patient ID parameter schema
 */
export const patientIdParamSchema = z.object({
  patientId: uuidSchema,
});

/**
 * Patient ID with filter schema
 */
export const patientIdWithFilterSchema = patientIdParamSchema.merge(searchSchema).merge(statusFilterSchema).merge(includeDeletedSchema).merge(paginationSchema);

/**
 * Reminder ID parameter schema
 */
export const reminderIdParamSchema = z.object({
  reminderId: uuidSchema,
});

/**
 * Content ID parameter schema
 */
export const contentIdParamSchema = z.object({
  contentId: uuidSchema,
});

/**
 * Template ID parameter schema
 */
export const templateIdParamSchema = z.object({
  templateId: uuidSchema,
});

/**
 * User ID parameter schema
 */
export const userIdParamSchema = z.object({
  userId: uuidSchema,
});

// ===== QUERY SCHEMAS =====

/**
 * Common query parameters for listing endpoints
 */
export const listQuerySchema = paginationSchema.merge(searchSchema).merge(statusFilterSchema).merge(includeDeletedSchema);

/**
 * Patient-specific query schema
 */
export const patientListQuerySchema = listQuerySchema.merge(
  z.object({
    assignedVolunteerId: uuidSchema.optional(),
  })
);

/**
 * Reminder-specific query schema
 */
export const reminderListQuerySchema = listQuerySchema.merge(reminderFilterSchema).merge(
  z.object({
    patientId: uuidSchema.optional(),
  })
);

// ===== EXPORT ALL SCHEMAS =====

export const schemas = {
  // Common
  uuid: uuidSchema,
  pagination: paginationSchema,
  dateString: dateStringSchema,
  timeString: timeStringSchema,
  booleanString: booleanStringSchema,
  search: searchSchema,
  statusFilter: statusFilterSchema,
  includeDeleted: includeDeletedSchema,

  // User
  createUser: createUserBodySchema,
  updateUser: updateUserBodySchema,
  userRole: userRoleSchema,

  // Patient
  createPatient: createPatientBodySchema,
  updatePatient: updatePatientBodySchema,
  patientIdParam: patientIdParamSchema,
  patientIdWithFilter: patientIdWithFilterSchema,

  // Reminder
  createReminder: createReminderBodySchema,
  updateReminder: updateReminderBodySchema,
  deleteReminders: deleteRemindersBodySchema,
  confirmReminder: confirmReminderBodySchema,
  reminderFilter: reminderFilterSchema,
  reminderIdParam: reminderIdParamSchema,

  // Content
  createArticle: createArticleBodySchema,
  createVideo: createVideoBodySchema,
  contentType: contentTypeSchema,
  contentStatus: contentStatusSchema,
  contentIdParam: contentIdParamSchema,

  // Template
  createTemplate: createTemplateBodySchema,
  updateTemplate: updateTemplateBodySchema,
  templateIdParam: templateIdParamSchema,

  // User
  userIdParam: userIdParamSchema,

  // Query
  list: listQuerySchema,
  patientList: patientListQuerySchema,
  reminderList: reminderListQuerySchema,
};

export default schemas;