import { z } from 'zod'

// Base validation schemas for PRIMA system

// Patient validation schemas
export const PatientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  address: z.string().max(500, 'Address too long').optional(),
  birthDate: z.string().datetime().optional(),
  diagnosisDate: z.string().datetime().optional(),
  cancerStage: z.enum(['I', 'II', 'III', 'IV']).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  notes: z.string().max(1000).optional(),
  photoUrl: z.string().url().optional(),
  assignedVolunteerId: z.string().uuid().optional()
})

export const PatientUpdateSchema = PatientCreateSchema.partial()

// Reminder validation schemas
export const ReminderCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorName: z.string().max(100).optional(),
  scheduledTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  frequency: z.enum(['CUSTOM', 'CUSTOM_RECURRENCE']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  customMessage: z.string().max(500).optional(),
  contentAttachments: z.array(z.object({
    contentType: z.enum(['article', 'video']),
    contentId: z.string().uuid(),
    contentTitle: z.string(),
    contentUrl: z.string().url()
  })).optional()
})

// Manual confirmation validation schemas
export const ManualConfirmationCreateSchema = z.object({
  patientId: z.string().uuid(),
  volunteerId: z.string().uuid(),
  reminderScheduleId: z.string().uuid().optional(),
  reminderLogId: z.string().uuid().optional(),
  visitDate: z.string().datetime(),
  visitTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  patientCondition: z.enum(['GOOD', 'FAIR', 'POOR']),
  symptomsReported: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
  followUpNeeded: z.boolean().default(false),
  followUpNotes: z.string().max(500).optional()
})

// Health notes validation schemas
export const HealthNoteCreateSchema = z.object({
  patientId: z.string().uuid(),
  note: z.string().min(1, 'Note cannot be empty').max(2000),
  noteDate: z.string().datetime()
})

// CMS content validation schemas
export const ArticleCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(300).optional(),
  featuredImageUrl: z.string().url().optional(),
  category: z.enum(['general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni']),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional()
})

export const VideoCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  durationMinutes: z.string().max(20).optional(),
  category: z.enum(['general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni']),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional()
})

// User profile validation schemas
export const UserProfileUpdateSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  hospitalName: z.string().max(100).optional()
})

// API request validation helpers
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError['issues'] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, errors: result.error.issues }
  }
}

// Type exports for use in components and APIs
export type PatientCreateData = z.infer<typeof PatientCreateSchema>
export type PatientUpdateData = z.infer<typeof PatientUpdateSchema>
export type ReminderCreateData = z.infer<typeof ReminderCreateSchema>
export type ManualConfirmationCreateData = z.infer<typeof ManualConfirmationCreateSchema>
export type HealthNoteCreateData = z.infer<typeof HealthNoteCreateSchema>
export type ArticleCreateData = z.infer<typeof ArticleCreateSchema>
export type VideoCreateData = z.infer<typeof VideoCreateSchema>
export type UserProfileUpdateData = z.infer<typeof UserProfileUpdateSchema>

