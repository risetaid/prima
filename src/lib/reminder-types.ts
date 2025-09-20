// Type-safe utilities for the reminder system
// Enhanced types for general reminder support

import { z } from 'zod';
import { reminderTypeEnum, reminderStatusEnum, confirmationStatusEnum } from '@/db/enums';

// Export all database types
export type { Reminder, ReminderInsert } from '@/db/reminder-schema';
export type { ReminderLog, ReminderLogInsert } from '@/db/reminder-schema';
export type { ManualConfirmation, ManualConfirmationInsert } from '@/db/reminder-schema';

// Enhanced business logic types
export interface ReminderCreateDTO {
  patientId: string;
  reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
  title?: string;
  description?: string;
  scheduledTime: string;
  message: string;
  startDate: string;
  endDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  recurrencePattern?: RecurrencePattern;
  metadata?: Record<string, unknown>;
  createdById: string;
}

export interface ReminderUpdateDTO {
  title?: string;
  description?: string;
  scheduledTime?: string;
  message?: string;
  endDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  recurrencePattern?: RecurrencePattern;
  metadata?: Record<string, unknown>;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  maxOccurrences?: number;
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  specificDates?: string[];
}

export interface ReminderLogCreateDTO {
  reminderId: string;
  patientId: string;
  action: 'SENT' | 'DELIVERED' | 'FAILED' | 'CONFIRMED' | 'MISSED' | 'FOLLOWUP_SENT' | 'RESPONSE_RECEIVED';
  actionType?: 'INITIAL' | 'FOLLOWUP' | 'MANUAL' | 'AUTOMATIC';
  message?: string;
  response?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ManualConfirmationCreateDTO {
  patientId: string;
  volunteerId: string;
  reminderId?: string;
  reminderType?: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
  confirmationType: 'VISIT' | 'PHONE_CALL' | 'MESSAGE' | 'GENERAL';
  visitDate?: string;
  visitTime?: string;
  patientCondition?: 'GOOD' | 'FAIR' | 'POOR';
  symptomsReported?: string[];
  notes?: string;
  followUpNeeded?: boolean;
  followUpNotes?: string;
}

// Zod validation schemas
export const reminderCreateSchema = z.object({
  patientId: z.string().uuid(),
  reminderType: z.enum(['MEDICATION', 'APPOINTMENT', 'GENERAL']),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  scheduledTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  message: z.string().min(1).max(2000),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  recurrencePattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1).max(365),
    endDate: z.string().datetime().optional(),
    maxOccurrences: z.number().min(1).max(1000).optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    specificDates: z.array(z.string().datetime()).optional(),
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdById: z.string().uuid(),
});

export const reminderUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  scheduledTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  message: z.string().min(1).max(2000).optional(),
  endDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  recurrencePattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1).max(365),
    endDate: z.string().datetime().optional(),
    maxOccurrences: z.number().min(1).max(1000).optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    specificDates: z.array(z.string().datetime()).optional(),
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const reminderLogCreateSchema = z.object({
  reminderId: z.string().uuid(),
  patientId: z.string().uuid(),
  action: z.enum(['SENT', 'DELIVERED', 'FAILED', 'CONFIRMED', 'MISSED', 'FOLLOWUP_SENT', 'RESPONSE_RECEIVED']),
  actionType: z.enum(['INITIAL', 'FOLLOWUP', 'MANUAL', 'AUTOMATIC']).optional(),
  message: z.string().max(2000).optional(),
  response: z.string().max(2000).optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const manualConfirmationCreateSchema = z.object({
  patientId: z.string().uuid(),
  volunteerId: z.string().uuid(),
  reminderId: z.string().uuid().optional(),
  reminderType: z.enum(['MEDICATION', 'APPOINTMENT', 'GENERAL']).optional(),
  confirmationType: z.enum(['VISIT', 'PHONE_CALL', 'MESSAGE', 'GENERAL']),
  visitDate: z.string().datetime().optional(),
  visitTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  patientCondition: z.enum(['GOOD', 'FAIR', 'POOR']).optional(),
  symptomsReported: z.array(z.string().max(200)).default([]),
  notes: z.string().max(2000).optional(),
  followUpNeeded: z.boolean().default(false),
  followUpNotes: z.string().max(2000).optional(),
});

// Utility functions
export const ReminderPriority = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  URGENT: 'urgent' as const,
} as const;

export const ReminderAction = {
  SENT: 'SENT' as const,
  DELIVERED: 'DELIVERED' as const,
  FAILED: 'FAILED' as const,
  CONFIRMED: 'CONFIRMED' as const,
  MISSED: 'MISSED' as const,
  FOLLOWUP_SENT: 'FOLLOWUP_SENT' as const,
  RESPONSE_RECEIVED: 'RESPONSE_RECEIVED' as const,
} as const;

export const ActionType = {
  INITIAL: 'INITIAL' as const,
  FOLLOWUP: 'FOLLOWUP' as const,
  MANUAL: 'MANUAL' as const,
  AUTOMATIC: 'AUTOMATIC' as const,
} as const;

export const ConfirmationType = {
  VISIT: 'VISIT' as const,
  PHONE_CALL: 'PHONE_CALL' as const,
  MESSAGE: 'MESSAGE' as const,
  GENERAL: 'GENERAL' as const,
} as const;

// Type guards
export const isValidReminderType = (value: string): value is typeof reminderTypeEnum.enumValues[number] => {
  return reminderTypeEnum.enumValues.includes(value as typeof reminderTypeEnum.enumValues[number]);
};

export const isValidReminderStatus = (value: string): value is typeof reminderStatusEnum.enumValues[number] => {
  return reminderStatusEnum.enumValues.includes(value as typeof reminderStatusEnum.enumValues[number]);
};

export const isValidConfirmationStatus = (value: string): value is typeof confirmationStatusEnum.enumValues[number] => {
  return confirmationStatusEnum.enumValues.includes(value as typeof confirmationStatusEnum.enumValues[number]);
};

export const isValidPriority = (value: string): value is keyof typeof ReminderPriority => {
  return Object.values(ReminderPriority).includes(value as 'low' | 'medium' | 'high' | 'urgent');
};

// Helper functions
export const getDefaultPriorityForType = (type: string): 'low' | 'medium' | 'high' | 'urgent' => {
  switch (type) {
    case 'MEDICATION':
      return 'high';
    case 'APPOINTMENT':
      return 'medium';
    default:
      return 'medium';
  }
};

export const getReminderTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'MEDICATION':
      return 'Pengingat Obat';
    case 'APPOINTMENT':
      return 'Janji Temu';
    case 'GENERAL':
      return 'Pengingat Umum';
    default:
      return type;
  }
};

export const getPriorityDisplayName = (priority: string): string => {
  switch (priority) {
    case 'low':
      return 'Rendah';
    case 'medium':
      return 'Sedang';
    case 'high':
      return 'Tinggi';
    case 'urgent':
      return 'Darurat';
    default:
      return priority;
  }
};

// Type inference helpers
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>;
export type ReminderLogCreateInput = z.infer<typeof reminderLogCreateSchema>;
export type ManualConfirmationCreateInput = z.infer<typeof manualConfirmationCreateSchema>;