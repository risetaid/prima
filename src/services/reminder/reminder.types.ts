// Reminder Service Type Definitions
// Centralized type definitions for the reminder system

import { reminders, manualConfirmations } from '@/db'
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'

// Database model types
export type Reminder = InferSelectModel<typeof reminders>
export type ReminderInsert = InferInsertModel<typeof reminders>
export type ManualConfirmation = InferSelectModel<typeof manualConfirmations>

// Legacy types for backwards compatibility
export type ReminderSchedule = Reminder
export type ReminderScheduleInsert = ReminderInsert
export type ReminderLog = Reminder // Combined into unified reminders table
export type ReminderLogInsert = ReminderInsert

// Business logic types
export interface CreateReminderDTO {
  patientId: string
  message: string
  time: string
  selectedDates?: string[]
  customRecurrence?: CustomRecurrence
  attachedContent?: AttachedContent[]
  createdById: string
  // Enhanced properties for general reminders
  reminderType?: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL'
  title?: string
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  recurrencePattern?: string
  metadata?: Record<string, unknown>
  // Type-specific properties
  medicationName?: string
  dosage?: string
  form?: string
  appointmentType?: string
  doctorName?: string
  location?: string
  category?: string
  customFields?: Record<string, unknown>
}

export interface UpdateReminderDTO {
  reminderTime: string
  customMessage: string
  attachedContent?: AttachedContent[]
  // Enhanced properties for general reminders
  reminderType?: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL'
  title?: string
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  recurrencePattern?: string
  metadata?: Record<string, unknown>
  // Type-specific properties
  medicationName?: string
  dosage?: string
  form?: string
  appointmentType?: string
  doctorName?: string
  location?: string
  category?: string
  customFields?: Record<string, unknown>
}

export interface CustomRecurrence {
  frequency: 'day' | 'week' | 'month'
  interval: number
  endType: 'never' | 'on' | 'after'
  endDate?: string
  occurrences?: number
  daysOfWeek?: string[]
}

export interface AttachedContent {
  id: string
  type: 'article' | 'video' | 'ARTICLE' | 'VIDEO'
  title: string
  url?: string
}

export interface ValidatedContent {
  id: string
  type: 'article' | 'video'
  title: string
  url: string
}

export interface ReminderWithPatient extends Reminder {
  patientName: string | null
  patientPhoneNumber: string | null
  contentAttachments?: ValidatedContent[]
}

export interface ReminderSendResult {
  success: boolean
  messageId?: string
  error?: string
  reminderId: string
  patientId: string
}

export interface BatchSendResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  duration: number
  details: string[]
  results: ReminderSendResult[]
}

export interface ReminderFilters {
  patientId?: string
  isActive?: boolean
  startDate?: Date
  endDate?: Date
  assignedVolunteerId?: string
  includeDeleted?: boolean
}

export interface PaginationOptions {
  page?: number
  limit?: number
  orderBy?: 'createdAt' | 'scheduledTime' | 'startDate'
  orderDirection?: 'asc' | 'desc'
}

export interface ReminderStats {
  total: number
  active: number
  delivered: number
  failed: number
  pending: number
  complianceRate: number
}

// Enum types for consistency
export enum ReminderFrequency {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
  CUSTOM_RECURRENCE = 'CUSTOM_RECURRENCE'
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

// Error types
export class ReminderError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ReminderError'
  }
}

export class ValidationError extends ReminderError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends ReminderError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends ReminderError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', 401, details)
    this.name = 'UnauthorizedError'
  }
}

