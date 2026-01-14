/**
 * Audit Service for PRIMA
 *
 * HIPAA-compliant audit logging for patient data access.
 * CRITICAL: All logged data is sanitized to remove PHI before storage.
 */

import { db } from '@/db';
import { auditLogs } from '@/db/audit-schema';
import { sanitizeForAudit } from '@/lib/phi-mask';
import { logger } from '@/lib/logger';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditLogParams {
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'PRINT';
  resourceType: 'patient' | 'reminder' | 'user' | 'message' | 'content' | 'export';
  resourceId?: string;
  patientId?: string;
  metadata?: Record<string, unknown>;
  context?: AuditContext;
}

/**
 * Audit Service - Centralized audit logging for compliance
 *
 * IMPORTANT: This service automatically sanitizes all metadata
 * to prevent PHI from being logged. Use logAccess() for all
 * patient data access logging.
 */
export class AuditService {
  private static instance: AuditService;

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log a patient data access event
   * CRITICAL: Metadata is automatically sanitized to remove PHI
   *
   * @param params - Audit log parameters
   */
  async logAccess(params: AuditLogParams): Promise<void> {
    try {
      // Sanitize metadata to remove any PHI before logging
      const sanitizedMetadata = params.metadata
        ? sanitizeForAudit(params.metadata)
        : undefined;

      // Check metadata size (prevent abuse via huge payloads)
      if (sanitizedMetadata) {
        const metadataSize = JSON.stringify(sanitizedMetadata).length;
        if (metadataSize > 10 * 1024) {
          // 10KB limit
          logger.warn('Audit metadata exceeded size limit, truncating', {
            originalSize: metadataSize,
            resourceId: params.resourceId,
          });
          sanitizedMetadata.truncated = true;
        }
      }

      await db.insert(auditLogs).values({
        userId: params.context?.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        patientId: params.patientId || null,
        ipAddress: params.context?.ipAddress || null,
        userAgent: params.context?.userAgent || null,
        requestId: params.context?.requestId || null,
        metadata: sanitizedMetadata || null,
      });
    } catch (error) {
      // Audit logging should never break the main operation
      // Log error but don't throw
      logger.error('Failed to write audit log', error as Error, {
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      });
    }
  }

  /**
   * Log patient data read access
   * Convenience method for READ operations on patient data
   */
  async logPatientAccess(
    patientId: string,
    resourceType: string,
    resourceId?: string,
    context?: AuditContext
  ): Promise<void> {
    await this.logAccess({
      action: 'READ',
      resourceType: resourceType as AuditLogParams['resourceType'],
      resourceId,
      patientId,
      context,
    });
  }

  /**
   * Log patient data modification
   * Convenience method for CREATE/UPDATE/DELETE on patient data
   */
  async logPatientModification(
    patientId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
    context?: AuditContext
  ): Promise<void> {
    await this.logAccess({
      action,
      resourceType: resourceType as AuditLogParams['resourceType'],
      resourceId,
      patientId,
      metadata,
      context,
    });
  }

  /**
   * Log data export (important for compliance)
   */
  async logExport(
    resourceType: string,
    recordCount: number,
    context?: AuditContext
  ): Promise<void> {
    await this.logAccess({
      action: 'EXPORT',
      resourceType: resourceType as AuditLogParams['resourceType'],
      metadata: { recordCount, exportedAt: new Date().toISOString() },
      context,
    });
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();
