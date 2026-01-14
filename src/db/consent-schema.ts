/**
 * Consent Tracking Schema for GDPR Compliance
 *
 * Tracks patient consent for data processing, communications, and research.
 */

import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { patients } from './core-schema';
import { relations } from 'drizzle-orm';

/**
 * Consent types that can be tracked
 */
export const CONSENT_TYPES = {
  // Core consents
  DATA_PROCESSING: 'data_processing',
  WHATSAPP_MESSAGING: 'whatsapp_messaging',
  EMAIL_COMMUNICATION: 'email_communication',
  SMS_COMMUNICATION: 'sms_communication',

  // Additional consents
  RESEARCH_PARTICIPATION: 'research_participation',
  TELEHEALTH_SERVICES: 'telemedicine',

  // Privacy rights
  DATA_EXPORT_REQUEST: 'data_export_request',
  DATA_DELETION_REQUEST: 'data_deletion_request',
  DATA_CORRECTION_REQUEST: 'data_correction_request',
} as const;

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

/**
 * Consent status values
 */
export const CONSENT_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  WITHDRAWN: 'withdrawn',
  PENDING: 'pending',
  EXPIRED: 'expired',
} as const;

export type ConsentStatus = (typeof CONSENT_STATUS)[keyof typeof CONSENT_STATUS];

/**
 * Patient consent records table
 * Tracks when consent was given, modified, or withdrawn
 */
export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Patient reference
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),

  // Consent type
  consentType: text('consent_type').notNull(),

  // Consent status
  status: text('status').notNull().default('pending'),

  // Consent details
  version: text('version').notNull(), // Version of consent terms at time of consent
  ipAddress: text('ip_address'), // IP address where consent was given
  userAgent: text('user_agent'), // Browser/client info

  // Timestamp tracking
  grantedAt: timestamp('granted_at', { withTimezone: true }),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // Additional metadata (consent proof, legal basis, etc.)
  metadata: jsonb('metadata'),

  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Indexes for common queries
export const consentIndexes = {
  // Index for looking up consents by patient
  patientIdx: `CREATE INDEX IF NOT EXISTS consents_patient_idx ON consents (patient_id)`,

  // Index for looking up consents by type and status
  typeStatusIdx: `CREATE INDEX IF NOT EXISTS consents_type_status_idx ON consents (consent_type, status)`,

  // Index for finding expired consents
  expiresIdx: `CREATE INDEX IF NOT EXISTS consents_expires_idx ON consents (expires_at) WHERE expires_at IS NOT NULL`,

  // Index for audit queries
  createdIdx: `CREATE INDEX IF NOT EXISTS consents_created_idx ON consents (created_at)`,
};

/**
 * Consent relations
 */
export const consentsRelations = relations(consents, ({ one }) => ({
  patient: one(patients, {
    fields: [consents.patientId],
    references: [patients.id],
  }),
}));

// Type exports for convenience
export type Consent = typeof consents.$inferSelect;
export type NewConsent = typeof consents.$inferInsert;

/**
 * Check if a consent type is a core consent (required for service)
 */
export function isCoreConsent(consentType: ConsentType): boolean {
  const coreConsents: ConsentType[] = [
    CONSENT_TYPES.DATA_PROCESSING,
    CONSENT_TYPES.WHATSAPP_MESSAGING,
  ];
  return coreConsents.includes(consentType);
}

/**
 * Check if a consent type is a privacy right (GDPR)
 */
export function isPrivacyRight(consentType: ConsentType): boolean {
  const privacyRights: ConsentType[] = [
    CONSENT_TYPES.DATA_EXPORT_REQUEST,
    CONSENT_TYPES.DATA_DELETION_REQUEST,
    CONSENT_TYPES.DATA_CORRECTION_REQUEST,
  ];
  return privacyRights.includes(consentType);
}
