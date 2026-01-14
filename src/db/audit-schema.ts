/**
 * Audit Log Schema for PRIMA
 *
 * HIPAA-compliant audit logging for patient data access tracking.
 * IMPORTANT: This table must NOT contain any PHI (Protected Health Information).
 * Only UUID references to patients are allowed - no names, phone numbers, etc.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Audit Logs Table
 *
 * Records all access to patient data for HIPAA compliance.
 * CRITICAL: No PHI fields allowed - only UUID references.
 *
 * Partitioned by created_at month for:
 * - Efficient queries by date range
 * - Easy retention management (drop old partitions)
 * - Better performance on large datasets
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    // Primary identifier
    id: uuid('id').primaryKey().defaultRandom(),

    // Who performed the action
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // What action was performed
    action: text('action').notNull(), // CREATE, READ, UPDATE, DELETE

    // What resource was accessed
    resourceType: text('resource_type').notNull(), // patient, reminder, etc.
    resourceId: uuid('resource_id'),

    // Patient reference (UUID ONLY - no identifiers!)
    patientId: uuid('patient_id'),

    // Request context (no PHI)
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),

    // Changes made (NO PHI allowed in metadata!)
    // Use sanitizeForAudit() before storing
    metadata: jsonb('metadata'), // { oldValue, newValue, ... } - NO PHI!

    // When it happened
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for user audit trails
    auditUserIdx: index('audit_logs_user_idx').on(table.userId),

    // Index for resource type queries
    auditResourceIdx: index('audit_logs_resource_idx').on(
      table.resourceType
    ),

    // Index for patient access logs (important for compliance)
    auditPatientIdx: index('audit_logs_patient_idx').on(table.patientId),

    // Index for time-based queries (most common access pattern)
    auditCreatedIdx: index('audit_logs_created_idx').on(table.createdAt),

    // Composite index for most common audit queries
    // "Show me all access to patient X from date Y to Z"
    auditPatientDateIdx: index('audit_logs_patient_date_idx').on(
      table.patientId,
      table.createdAt
    ),

    // Index for action type queries
    auditActionIdx: index('audit_logs_action_idx').on(
      table.action,
      table.createdAt
    ),
  })
);

// Import users table for foreign key reference
// This import is needed for the foreign key to work
import { users } from './core-schema';

/**
 * Audit Action Types
 * Standardized action codes for audit logging
 */
export const AuditAction = {
  CREATE: 'CREATE' as const,
  READ: 'READ' as const,
  UPDATE: 'UPDATE' as const,
  DELETE: 'DELETE' as const,
  LOGIN: 'LOGIN' as const,
  LOGOUT: 'LOGOUT' as const,
  EXPORT: 'EXPORT' as const,
  PRINT: 'PRINT' as const,
} as const;

export type AuditActionType =
  (typeof AuditAction)[keyof typeof AuditAction];

/**
 * Resource Types
 * Standardized resource codes for audit logging
 */
export const AuditResourceType = {
  PATIENT: 'patient' as const,
  REMINDER: 'reminder' as const,
  USER: 'user' as const,
  MESSAGE: 'message' as const,
  CONTENT: 'content' as const,
  EXPORT: 'export' as const,
} as const;

export type AuditResourceTypeType =
  (typeof AuditResourceType)[keyof typeof AuditResourceType];

/**
 * Sample query to create partitioned audit_logs table
 * Run this as a migration for production:
 *
 * -- Create parent table with partitioning
 * CREATE TABLE IF NOT EXISTS audit_logs (
 *     id UUID PRIMARY KEY,
 *     user_id UUID REFERENCES users(id),
 *     action TEXT NOT NULL,
 *     resource_type TEXT NOT NULL,
 *     resource_id UUID,
 *     patient_id UUID,
 *     ip_address TEXT,
 *     user_agent TEXT,
 *     request_id TEXT,
 *     metadata JSONB,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * ) PARTITION BY RANGE (created_at);
 *
 * -- Create monthly partitions
 * CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
 *     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
 * CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
 *     FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
 * -- ... continue for desired range
 */
