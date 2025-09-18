// Followup Automation System Types
// Type definitions for Redis-based followup system

export interface FollowupData {
  id: string;
  patientId: string;
  reminderId: string;
  phoneNumber: string;
  patientName: string;
  medicationName?: string;
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
}

export type FollowupType =
  | 'MEDICATION_REMINDER_15MIN'
  | 'MEDICATION_REMINDER_2H'
  | 'MEDICATION_REMINDER_24H'
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
  medicationName?: string;
  followupType?: FollowupType;
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