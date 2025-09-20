// Followup Automation System Types
// Type definitions for Redis-based followup system

export interface FollowupData {
  id: string;
  patientId: string;
  reminderId: string;
  phoneNumber: string;
  patientName: string;
  reminderName?: string;
  followupType: FollowupType;
  stage: FollowupStage;
  scheduledAt: Date;
  sentAt?: Date;
  respondedAt?: Date;
  response?: string;
  status: FollowupStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  messageId?: string; // WhatsApp message ID
  // Enhanced fields for type-aware followups
  reminderType?: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
  reminderTitle?: string;
  reminderMessage?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata?: Record<string, unknown>;
}

export type FollowupType =
  | 'REMINDER_15MIN'
  | 'REMINDER_2H'
  | 'REMINDER_24H'
  | 'GENERAL_CONFIRMATION';

export type FollowupStage =
  | 'INITIAL'
  | 'FOLLOWUP_15MIN'
  | 'FOLLOWUP_2H'
  | 'FOLLOWUP_24H'
  | 'COMPLETED'
  | 'EXPIRED';

export type FollowupStatus =
  | 'PENDING'
  | 'SENT'
  | 'RESPONDED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface FollowupScheduleRequest {
  patientId: string;
  reminderId: string;
  phoneNumber: string;
  patientName: string;
  reminderName?: string;
  followupType?: FollowupType;
  // Enhanced fields for type-aware followups
  reminderType?: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
  reminderTitle?: string;
  reminderMessage?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata?: Record<string, unknown>;
}

export interface FollowupResponse {
  followupId: string;
  patientId: string;
  response: string;
  messageId?: string;
  receivedAt: Date;
}

export interface FollowupProcessingResult {
  processed: boolean;
  followupId: string;
  status: FollowupStatus;
  sentMessageId?: string;
  error?: string;
  emergencyDetected?: boolean;
  escalated?: boolean;
}

export interface FollowupStats {
  total: number;
  pending: number;
  sent: number;
  responded: number;
  confirmed: number;
  failed: number;
  cancelled: number;
  expired: number;
}

export interface FollowupQueueItem {
  followupId: string;
  scheduledAt: Date;
  priority: number; // Lower number = higher priority
}